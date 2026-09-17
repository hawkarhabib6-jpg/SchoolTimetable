package com.herem.adstudio.core.di

import androidx.media3.common.util.UnstableApi
import com.herem.adstudio.BuildConfig
import com.herem.adstudio.data.render.FfmpegCommandBuilder
import com.herem.adstudio.data.render.Media3RenderEngine
import com.herem.adstudio.domain.render.RenderEngine
import com.herem.adstudio.domain.render.RenderEngineSelector
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /** Injected rather than referenced directly so tests can swap in a test dispatcher. */
    @Provides
    @Singleton
    fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO

    @OptIn(UnstableApi::class)
    @Provides
    @Singleton
    fun provideRenderEngineSelector(
        media3: Media3RenderEngine,
        commandBuilder: FfmpegCommandBuilder,
    ): RenderEngineSelector = RenderEngineSelector(
        buildList {
            add(media3)
            // The FFmpeg engine only exists in builds made with -Padstudio.ffmpegKit=true,
            // so it is resolved reflectively: Hilt cannot reference a class that may not
            // be on the compile classpath.
            if (BuildConfig.HAS_FFMPEG_KIT) ffmpegEngineOrNull(commandBuilder)?.let(::add)
        }
    )

    private fun ffmpegEngineOrNull(commandBuilder: FfmpegCommandBuilder): RenderEngine? =
        runCatching {
            Class.forName("com.herem.adstudio.data.render.FfmpegKitRenderEngine")
                .getConstructor(FfmpegCommandBuilder::class.java)
                .newInstance(commandBuilder) as RenderEngine
        }.getOrNull()
}
