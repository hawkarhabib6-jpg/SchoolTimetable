package com.herem.adstudio.data.render

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.render.RenderEngine
import com.herem.adstudio.domain.render.RenderEngineId
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Fallback engine for edits Media3 cannot express exactly — wipes, pixelize, circle-open,
 * and anything else that only exists as an FFmpeg filter.
 *
 * This file is only compiled into builds started with `-Padstudio.ffmpegKit=true` (see
 * `app/build.gradle.kts`): the upstream FFmpegKit artifacts were withdrawn from the public
 * repositories, so the dependency has to come from your own mirror or fork. The command
 * itself is built by [FfmpegCommandBuilder], which is always compiled and always tested.
 *
 * Trade-off worth knowing before you enable it: x264 here is a *software* encoder. On a
 * mid-range phone a 15 s 1080x1920 ad takes ~20–40 s and warms the device noticeably,
 * against a few seconds on the Media3 path.
 */
@Singleton
class FfmpegKitRenderEngine @Inject constructor(
    private val commandBuilder: FfmpegCommandBuilder,
) : RenderEngine {

    override val id: RenderEngineId = RenderEngineId.FFMPEG

    override fun isAvailable(): Boolean = runCatching {
        Class.forName("com.arthenica.ffmpegkit.FFmpegKit")
        true
    }.getOrDefault(false)

    /** The filtergraph covers every transition in the catalogue. */
    override fun supports(project: AdProject): Boolean = true

    override fun render(project: AdProject, outputPath: String): Flow<RenderProgress> = callbackFlow {
        trySend(RenderProgress.Preparing)
        File(outputPath).parentFile?.mkdirs()

        val totalMs = project.totalDurationMs
        val arguments = commandBuilder.build(project, outputPath).toTypedArray()

        val session: FFmpegSession = FFmpegKit.executeWithArgumentsAsync(
            arguments,
            /* completeCallback = */ { completed ->
                when {
                    ReturnCode.isSuccess(completed.returnCode) -> {
                        val file = File(outputPath)
                        trySend(
                            RenderProgress.Completed(
                                outputPath = outputPath,
                                durationMs = totalMs,
                                sizeBytes = file.length(),
                            )
                        )
                    }

                    ReturnCode.isCancel(completed.returnCode) -> trySend(RenderProgress.Cancelled)

                    else -> {
                        // failStackTrace is null on a normal filtergraph error; the tail
                        // of the log is what actually names the bad filter.
                        val detail = completed.failStackTrace
                            ?: completed.allLogsAsString?.takeLast(LOG_TAIL_CHARS)
                        trySend(
                            RenderProgress.Failed(
                                message = detail ?: "FFmpeg failed (${completed.returnCode})",
                            )
                        )
                    }
                }
                close()
            },
            /* logCallback = */ null,
            /* statisticsCallback = */ { stats ->
                if (totalMs > 0) {
                    val percent = ((stats.time * 100L) / totalMs).toInt().coerceIn(0, 99)
                    trySend(RenderProgress.Running(percent = percent, renderedMs = stats.time.toLong()))
                }
            },
        )

        awaitClose { FFmpegKit.cancel(session.sessionId) }
    }

    private companion object {
        const val LOG_TAIL_CHARS = 800
    }
}
