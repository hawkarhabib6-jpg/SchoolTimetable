package com.herem.adstudio.domain.repository

import com.herem.adstudio.domain.model.BeatMap

interface AudioRepository {
    /** Onset/tempo analysis of a music file, used by beat-synced cuts and text pops. */
    suspend fun detectBeats(uri: String): Result<BeatMap>
}
