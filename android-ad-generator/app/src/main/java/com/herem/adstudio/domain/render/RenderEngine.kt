package com.herem.adstudio.domain.render

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.RenderProgress
import kotlinx.coroutines.flow.Flow

enum class RenderEngineId { MEDIA3, FFMPEG }

/**
 * The single seam between the editor and whatever actually writes an MP4.
 *
 * Both implementations are cold flows: collecting starts the render, cancelling the
 * collector cancels it. Nothing above this interface knows about `Transformer`,
 * filtergraphs, or MediaCodec.
 */
interface RenderEngine {
    val id: RenderEngineId

    /** False when the engine's native side is not present in this build/device. */
    fun isAvailable(): Boolean

    /**
     * True when this engine can render [project] *exactly*. The Media3 engine returns
     * false for filtergraph-only transitions (see [com.herem.adstudio.domain.model.TransitionType]),
     * which is how [RenderEngineSelector] decides to hand the job to FFmpeg instead.
     */
    fun supports(project: AdProject): Boolean

    fun render(project: AdProject, outputPath: String): Flow<RenderProgress>
}

/**
 * Picks an engine per project: Media3 first (hardware pipeline, no 20 MB of native libs
 * in the APK), FFmpeg only when the edit uses something Media3 cannot express.
 */
class RenderEngineSelector(private val engines: List<RenderEngine>) {

    fun select(project: AdProject): RenderEngine {
        val available = engines.filter { it.isAvailable() }
        require(available.isNotEmpty()) { "No render engine available in this build" }
        return available.firstOrNull { it.supports(project) }
            ?: available.first { it.id == RenderEngineId.MEDIA3 }
    }
}
