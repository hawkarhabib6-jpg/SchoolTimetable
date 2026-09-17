package com.herem.adstudio.core.di

import com.herem.adstudio.data.audio.BeatDetector
import com.herem.adstudio.data.media.MediaRepositoryImpl
import com.herem.adstudio.data.repository.InMemoryProjectRepository
import com.herem.adstudio.data.repository.RenderRepositoryImpl
import com.herem.adstudio.domain.repository.AudioRepository
import com.herem.adstudio.domain.repository.MediaRepository
import com.herem.adstudio.domain.repository.ProjectRepository
import com.herem.adstudio.domain.repository.RenderRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * The only place where the domain's interfaces meet their implementations. Swapping the
 * project store for Room, or the beat detector for an ML one, happens here and nowhere else.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class DataModule {

    @Binds
    @Singleton
    abstract fun bindMediaRepository(impl: MediaRepositoryImpl): MediaRepository

    @Binds
    @Singleton
    abstract fun bindRenderRepository(impl: RenderRepositoryImpl): RenderRepository

    @Binds
    @Singleton
    abstract fun bindProjectRepository(impl: InMemoryProjectRepository): ProjectRepository

    @Binds
    @Singleton
    abstract fun bindAudioRepository(impl: BeatDetector): AudioRepository
}
