package com.herem.adstudio.domain.repository

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.RenderProgress
import kotlinx.coroutines.flow.Flow

interface RenderRepository {
    fun export(project: AdProject): Flow<RenderProgress>

    /** Moves a finished render out of cache into the public Movies/ collection. */
    suspend fun publishToGallery(outputPath: String, displayName: String): Result<String>
}
