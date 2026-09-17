package com.herem.adstudio.data.repository

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.herem.adstudio.data.render.ExportService
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.render.RenderEngineSelector
import com.herem.adstudio.domain.repository.MediaRepository
import com.herem.adstudio.domain.repository.RenderRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RenderRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val engineSelector: RenderEngineSelector,
    private val mediaRepository: MediaRepository,
    private val ioDispatcher: CoroutineDispatcher,
) : RenderRepository {

    override fun export(project: AdProject): Flow<RenderProgress> = flow {
        val engine = engineSelector.select(project)
        val outputPath = mediaRepository.newOutputPath(project.name)
        ExportService.update(context, 0)
        engine.render(project, outputPath).collect { progress ->
            if (progress is RenderProgress.Running) ExportService.update(context, progress.percent)
            emit(progress)
        }
    }.onCompletion {
        // Covers success, failure and collector cancellation alike.
        ExportService.stop(context)
    }

    override suspend fun publishToGallery(
        outputPath: String,
        displayName: String,
    ): Result<String> = withContext(ioDispatcher) {
        runCatching {
            val source = File(outputPath)
            require(source.exists()) { "Render is missing: $outputPath" }
            val name = if (displayName.endsWith(".mp4")) displayName else "$displayName.mp4"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Video.Media.DISPLAY_NAME, name)
                    put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                    put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/AdStudio")
                    put(MediaStore.Video.Media.IS_PENDING, 1)
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
                    ?: error("MediaStore refused the insert")
                resolver.openOutputStream(uri).use { out ->
                    requireNotNull(out) { "Could not open $uri" }
                    source.inputStream().use { it.copyTo(out) }
                }
                values.clear()
                values.put(MediaStore.Video.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                uri.toString()
            } else {
                @Suppress("DEPRECATION")
                val moviesDir = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
                    "AdStudio",
                ).apply { mkdirs() }
                val target = File(moviesDir, name)
                source.copyTo(target, overwrite = true)
                target.absolutePath
            }
        }
    }
}
