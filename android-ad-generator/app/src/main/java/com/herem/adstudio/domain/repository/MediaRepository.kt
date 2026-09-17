package com.herem.adstudio.domain.repository

import com.herem.adstudio.domain.model.MediaAsset

interface MediaRepository {
    /** Reads width/height/duration/rotation out of the file the user picked. */
    suspend fun probe(uri: String): Result<MediaAsset>

    suspend fun probeAll(uris: List<String>): List<MediaAsset>

    /** A cache path the render engines may write to. */
    fun newOutputPath(projectName: String): String
}
