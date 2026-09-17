package com.herem.adstudio.data.render

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.ChannelMixingAudioProcessor
import androidx.media3.common.audio.ChannelMixingMatrix
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.TextureOverlay
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import com.google.common.collect.ImmutableList
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.model.TransitionType
import com.herem.adstudio.domain.render.RenderEngine
import com.herem.adstudio.domain.render.RenderEngineId
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The default engine: `androidx.media3.transformer.Transformer`.
 *
 * Why this one first — it uses MediaCodec, so encoding is hardware-accelerated and roughly
 * an order of magnitude faster and cooler than a software x264 pass, and it adds no native
 * libraries to the APK. What it cannot do is arbitrary filtergraph transitions; those go to
 * the FFmpeg engine (see [supports]).
 *
 * Threading: `Transformer` must be built, started and polled on a thread with a `Looper`.
 * Everything that touches it here hops to the main dispatcher; the flow itself is cold and
 * cancellable — collecting starts the export, cancelling the collector cancels it.
 *
 * API note: pinned to Media3 **1.5.1**.
 */
@UnstableApi
@Singleton
class Media3RenderEngine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val effectFactory: Media3EffectFactory,
) : RenderEngine {

    override val id: RenderEngineId = RenderEngineId.MEDIA3

    override fun isAvailable(): Boolean = true

    /**
     * Media3 renders every transition as fade-through-black. That is a faithful stand-in
     * for the dissolve family, but not for a wipe or a pixelize, so those projects are
     * handed to FFmpeg instead of being silently downgraded.
     */
    override fun supports(project: AdProject): Boolean =
        project.clips.all {
            it.transitionToNext == TransitionType.CUT || it.transitionToNext.media3Approximated
        }

    override fun render(project: AdProject, outputPath: String): Flow<RenderProgress> = callbackFlow {
        val plan = Media3TimelinePlan.from(project)
        if (plan.items.isEmpty()) {
            trySend(RenderProgress.Failed("Nothing to render"))
            close()
            return@callbackFlow
        }

        trySend(RenderProgress.Preparing)
        File(outputPath).parentFile?.mkdirs()

        val listener = object : Transformer.Listener {
            override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                trySend(
                    RenderProgress.Completed(
                        outputPath = outputPath,
                        durationMs = exportResult.durationMs.takeIf { it > 0 } ?: plan.totalDurationMs,
                        sizeBytes = exportResult.fileSizeBytes.takeIf { it > 0 } ?: File(outputPath).length(),
                    )
                )
                close()
            }

            override fun onError(
                composition: Composition,
                exportResult: ExportResult,
                exportException: ExportException,
            ) {
                trySend(
                    RenderProgress.Failed(
                        message = exportException.message ?: "Export failed (${exportException.errorCode})",
                        cause = exportException,
                    )
                )
                close()
            }
        }

        val transformer = withContext(Dispatchers.Main) {
            val t = Transformer.Builder(context)
                .setVideoMimeType(MimeTypes.VIDEO_H264)
                .setAudioMimeType(MimeTypes.AUDIO_AAC)
                .addListener(listener)
                .build()
            t.start(buildComposition(project, plan), outputPath)
            t
        }

        // Transformer has no progress callback; it is polled.
        val poller = launch {
            val holder = ProgressHolder()
            while (isActive) {
                val state = withContext(Dispatchers.Main) { transformer.getProgress(holder) }
                if (state == Transformer.PROGRESS_STATE_AVAILABLE) {
                    val percent = holder.progress.coerceIn(0, 100)
                    trySend(
                        RenderProgress.Running(
                            percent = percent,
                            renderedMs = plan.totalDurationMs * percent / 100,
                        )
                    )
                }
                delay(POLL_INTERVAL_MS)
            }
        }

        awaitClose {
            poller.cancel()
            // cancel() must run on the Transformer's looper; posting keeps awaitClose
            // non-blocking.
            Handler(Looper.getMainLooper()).post { runCatching { transformer.cancel() } }
        }
    }

    // -------------------------------------------------------------------------

    private fun buildComposition(project: AdProject, plan: Media3TimelinePlan): Composition {
        val clipsById = project.clips.associateBy { it.id }
        val videoSequence = EditedMediaItemSequence.Builder().apply {
            plan.items.forEach { item ->
                val clip = clipsById.getValue(item.clipId)
                addItem(editedItem(clip, item, project))
            }
        }.build()

        val sequences = mutableListOf(videoSequence)
        project.audio?.let { audio ->
            val music = EditedMediaItem.Builder(
                MediaItem.Builder()
                    .setUri(audio.uri)
                    .setClippingConfiguration(
                        MediaItem.ClippingConfiguration.Builder()
                            .setStartPositionMs(audio.startOffsetMs)
                            .setEndPositionMs(audio.startOffsetMs + plan.totalDurationMs)
                            .build()
                    )
                    .build()
            )
                .setRemoveVideo(true)
                .setEffects(Effects(listOf(gain(audio.volume)), emptyList()))
                .build()

            sequences += EditedMediaItemSequence.Builder(music)
                // A short track loops until the video ends instead of dropping to silence.
                .setIsLooping(true)
                .build()
        }

        val overlays = mutableListOf<TextureOverlay>()
        if (plan.fades.isNotEmpty()) overlays += FadeThroughBlackOverlay(plan.fades)
        project.overlays.forEach { overlays += TimedTextOverlay(it, project.settings.height) }

        return Composition.Builder(sequences)
            .apply {
                if (overlays.isNotEmpty()) {
                    setEffects(
                        Effects(
                            emptyList(),
                            listOf(OverlayEffect(ImmutableList.copyOf(overlays))),
                        )
                    )
                }
            }
            // Forces an audio track even when every source is a silent image, so the
            // muxer always produces a file social platforms accept.
            .experimentalSetForceAudioTrack(true)
            .build()
    }

    private fun editedItem(
        clip: Clip,
        item: Media3TimelinePlan.PlannedItem,
        project: AdProject,
    ): EditedMediaItem {
        val builder = MediaItem.Builder().setUri(item.uri)
        if (item.isImage) {
            builder.setImageDurationMs(item.durationMs)
        } else {
            builder.setClippingConfiguration(
                MediaItem.ClippingConfiguration.Builder()
                    .setStartPositionMs(item.sourceStartMs)
                    .setEndPositionMs(item.sourceEndMs)
                    .build()
            )
        }

        // With a music bed and no "keep original sound", the source audio is dropped
        // entirely rather than mixed at zero — cheaper, and it avoids a codec round-trip.
        val audio = project.audio
        val removeOriginalAudio = audio != null && audio.originalAudioVolume <= 0f

        val effects = Effects(
            effectFactory.audioProcessorsFor(clip) + listOfNotNull(
                clip.volume.takeIf { it != 1f }?.let { gain(it) }
            ),
            effectFactory.videoEffectsFor(clip, project.settings),
        )

        return EditedMediaItem.Builder(builder.build())
            .setFrameRate(project.settings.frameRate)
            .setRemoveAudio(removeOriginalAudio)
            .setEffects(effects)
            .build()
    }

    /** Media3 has no volume effect; a channel-mixing matrix scaled by [level] is the idiom. */
    private fun gain(level: Float) = ChannelMixingAudioProcessor().apply {
        putChannelMixingMatrix(ChannelMixingMatrix.createForConstantGain(1, 1).scaleBy(level))
        putChannelMixingMatrix(ChannelMixingMatrix.createForConstantGain(2, 2).scaleBy(level))
    }

    private companion object {
        const val POLL_INTERVAL_MS = 250L
    }
}
