package com.herem.adstudio.data.render

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.TextAnimation
import com.herem.adstudio.domain.model.TextFont
import com.herem.adstudio.domain.model.TextOverlay
import com.herem.adstudio.domain.model.TransitionType
import com.herem.adstudio.domain.model.effectiveTransitionMs
import java.util.Locale
import javax.inject.Inject

/**
 * Builds the FFmpeg argument vector that merges a project's images/clips into one
 * vertical ad: scale + crop to the export frame, optional Ken Burns motion, colour look,
 * `xfade` transitions between every pair, burned-in text, and a music bed.
 *
 * This class is deliberately **pure**: no Android, no FFmpegKit, no I/O. That is what
 * makes the filtergraph — the part that is genuinely easy to get wrong — testable on the
 * JVM (`FfmpegCommandBuilderTest`), and it keeps the same graph usable from a desktop
 * ffmpeg binary while debugging.
 *
 * ### The offset arithmetic
 * `xfade` consumes `t` seconds from *both* sides of a join, so the k-th transition must
 * start at `sum(d[0] … d[k-1]) - k*t`. Get this wrong and the tail of the video freezes
 * or the last clip is cut off — the single most common bug in image-to-video pipelines.
 * [transitionOffsetMs] isolates that arithmetic so a unit test can pin it down.
 */
class FfmpegCommandBuilder @Inject constructor(
    /** Resolves a [TextFont] to an absolute .ttf path on the device, or null for the default. */
    private val fontPathResolver: FontPathResolver = FontPathResolver { null },
) {

    fun interface FontPathResolver {
        fun pathFor(font: TextFont): String?
    }

    /**
     * @param textFiles Optional map of overlay id → absolute path of a UTF-8 file holding
     *   that overlay's text. When present the graph uses `textfile=`, which sidesteps
     *   filtergraph escaping entirely — the recommended path in production, and required
     *   for Kurdish/Arabic text with punctuation.
     */
    fun build(
        project: AdProject,
        outputPath: String,
        textFiles: Map<String, String> = emptyMap(),
    ): List<String> {
        require(project.clips.isNotEmpty()) { "Nothing to render" }

        val settings = project.settings
        val width = settings.width
        val height = settings.height
        val fps = settings.frameRate
        val totalMs = project.totalDurationMs

        val args = mutableListOf<String>()
        val filters = mutableListOf<String>()

        // ---- inputs -------------------------------------------------------------
        project.clips.forEach { clip ->
            when (val asset = clip.asset) {
                is MediaAsset.Image -> {
                    // A still has no duration of its own: loop it for exactly as long as
                    // the timeline says, transitions included.
                    args += listOf("-loop", "1", "-t", clip.durationMs.asSeconds(), "-i", asset.uri)
                }

                is MediaAsset.Video -> {
                    val end = if (clip.trimEndMs > clip.trimStartMs) clip.trimEndMs else asset.durationMs
                    // -ss before -i seeks on the input (fast, keyframe accurate enough here).
                    args += listOf("-ss", clip.trimStartMs.asSeconds(), "-to", end.asSeconds(), "-i", asset.uri)
                }
            }
        }
        val musicInputIndex = project.audio?.let { audio ->
            args += listOf("-ss", audio.startOffsetMs.asSeconds(), "-i", audio.uri)
            project.clips.size
        }

        // ---- per-clip video chains ---------------------------------------------
        project.clips.forEachIndexed { index, clip ->
            filters += buildString {
                append("[$index:v]")
                append(scaleAndCrop(width, height, upscaleForMotion = clip.motionEffect != MotionEffect.NONE))
                append(",")
                if (clip.speedFactor != 1f && !clip.isImage) {
                    append("setpts=PTS/${clip.speedFactor.fmt()},")
                }
                motionFilter(clip, width, height, fps)?.let { append(it).append(",") }
                clip.colorFilter.ffmpegFilter?.let { append(it).append(",") }
                append("fps=$fps,format=yuv420p,setsar=1")
                append("[v$index]")
            }
        }

        // ---- xfade chain --------------------------------------------------------
        val lastVideoLabel = buildTransitionChain(project, filters)

        // ---- burned-in text -----------------------------------------------------
        val textedLabel = buildTextChain(
            overlays = project.overlays,
            input = lastVideoLabel,
            height = height,
            textFiles = textFiles,
            filters = filters,
        )

        // ---- audio --------------------------------------------------------------
        val audioLabel = buildAudioChain(project, musicInputIndex, totalMs, filters)

        args += listOf("-filter_complex", filters.joinToString(separator = ";"))
        args += listOf("-map", "[$textedLabel]")
        audioLabel?.let { args += listOf("-map", "[$it]") }

        // ---- encode -------------------------------------------------------------
        args += listOf(
            "-c:v", "libx264",
            "-preset", "medium",
            "-profile:v", "high",
            "-level", "4.1",
            "-b:v", settings.videoBitrateBps.toString(),
            "-maxrate", (settings.videoBitrateBps * 1.3).toInt().toString(),
            "-bufsize", (settings.videoBitrateBps * 2).toString(),
            "-pix_fmt", "yuv420p",
            "-r", fps.toString(),
            // Keyframe every second: social platforms re-encode, and short GOPs survive it better.
            "-g", fps.toString(),
            "-movflags", "+faststart",
        )
        if (audioLabel != null) {
            args += listOf("-c:a", "aac", "-b:a", settings.audioBitrateBps.toString(), "-ar", "44100")
        }
        // The audio graph can outrun the video graph by a few frames; -t pins the length.
        args += listOf("-t", totalMs.asSeconds(), "-y", outputPath)
        return args
    }

    // -------------------------------------------------------------------------
    // filter fragments
    // -------------------------------------------------------------------------

    /**
     * Cover-and-crop, never letterbox: scale so the *smaller* side fills the frame, then
     * crop the overflow. `force_original_aspect_ratio=increase` is what makes a 4:3 photo
     * fill a 9:16 reel without black bars.
     *
     * When a motion effect follows, we scale to 2x first: `zoompan` steps its zoom in
     * integer source pixels, and zooming a frame that is already at output resolution
     * produces visible jitter.
     */
    private fun scaleAndCrop(width: Int, height: Int, upscaleForMotion: Boolean): String {
        val factor = if (upscaleForMotion) 2 else 1
        val w = width * factor
        val h = height * factor
        return "scale=$w:$h:force_original_aspect_ratio=increase,crop=$w:$h"
    }

    /** Ken Burns / pan, expressed as a `zoompan` ramp over the clip's own frame count. */
    private fun motionFilter(clip: Clip, width: Int, height: Int, fps: Int): String? {
        val motion = clip.motionEffect
        if (motion == MotionEffect.NONE) return null
        val frames = ((clip.durationMs / 1000.0) * fps).toInt().coerceAtLeast(1)
        val zoomStep = ((motion.endScale - motion.startScale) / frames).fmt(6)
        val zoomExpr = if (motion.endScale >= motion.startScale) {
            "min(zoom+$zoomStep,${motion.endScale.fmt()})"
        } else {
            "max(zoom-${(-(motion.endScale - motion.startScale) / frames).fmt(6)},${motion.endScale.fmt()})"
        }
        // x/y are top-left of the crop window inside the (zoomed) source.
        val panX = motion.panXFraction
        val panY = motion.panYFraction
        val xExpr = "iw/2-(iw/zoom/2)+(${panX.fmt()}*iw*on/$frames)"
        val yExpr = "ih/2-(ih/zoom/2)+(${panY.fmt()}*ih*on/$frames)"
        return "zoompan=z='$zoomExpr':x='$xExpr':y='$yExpr':d=$frames:s=${width}x$height:fps=$fps"
    }

    /**
     * Chains `[v0][v1]xfade…[x1]`, `[x1][v2]xfade…[x2]`, … and returns the final label.
     * A [TransitionType.CUT] join is a plain `concat`, which is cheaper than an xfade of
     * zero length and does not shift the timeline.
     */
    private fun buildTransitionChain(project: AdProject, filters: MutableList<String>): String {
        var current = "v0"
        for (index in 1 until project.clips.size) {
            val previous = project.clips[index - 1]
            val transition = previous.transitionToNext
            val overlapMs = previous.effectiveTransitionMs(next = true)
            val out = "x$index"
            filters += if (transition == TransitionType.CUT || overlapMs <= 0L) {
                "[$current][v$index]concat=n=2:v=1:a=0[$out]"
            } else {
                val offsetMs = transitionOffsetMs(project, index)
                "[$current][v$index]xfade=transition=${transition.ffmpegName}" +
                    ":duration=${overlapMs.asSeconds()}:offset=${offsetMs.asSeconds()}[$out]"
            }
            current = out
        }
        return current
    }

    private fun buildTextChain(
        overlays: List<TextOverlay>,
        input: String,
        height: Int,
        textFiles: Map<String, String>,
        filters: MutableList<String>,
    ): String {
        if (overlays.isEmpty()) return input
        var current = input
        overlays.forEachIndexed { index, overlay ->
            val out = "t$index"
            filters += "[$current]${drawText(overlay, height, textFiles[overlay.id])}[$out]"
            current = out
        }
        return current
    }

    private fun drawText(overlay: TextOverlay, height: Int, textFilePath: String?): String {
        val start = overlay.startMs / 1000.0
        val end = overlay.endMs / 1000.0
        val fontSize = (overlay.fontSizeFraction * height).toInt().coerceAtLeast(8)
        val body = mutableListOf<String>()

        body += if (textFilePath != null) {
            "textfile='${textFilePath}':reload=0"
        } else {
            "text='${escapeDrawTextValue(overlay.text)}'"
        }
        fontPathResolver.pathFor(overlay.font)?.let { body += "fontfile='$it'" }
        body += "fontsize=$fontSize"
        body += "fontcolor=${overlay.colorArgb.toFfmpegColor()}"
        overlay.backgroundArgb?.let {
            body += "box=1"
            body += "boxcolor=${it.toFfmpegColor()}"
            body += "boxborderw=${(fontSize * 0.35).toInt()}"
        }
        body += "x=(w*${overlay.centerX.fmt()})-(text_w/2)"
        body += yExpression(overlay, start)
        body += "enable='between(t,${start.fmt()},${end.fmt()})'"
        alphaExpression(overlay, start, end)?.let { body += it }
        return "drawtext=" + body.joinToString(":")
    }

    private fun yExpression(overlay: TextOverlay, startSec: Double): String {
        val base = "(h*${overlay.centerY.fmt()})-(text_h/2)"
        return when (overlay.animation) {
            // Rises SLIDE_PX over SLIDE_SEC, then holds.
            TextAnimation.SLIDE_UP ->
                "y='$base+$SLIDE_PX*(1-min((t-${startSec.fmt()})/$SLIDE_SEC,1))'"
            else -> "y=$base"
        }
    }

    private fun alphaExpression(overlay: TextOverlay, startSec: Double, endSec: Double): String? {
        val fade = when (overlay.animation) {
            TextAnimation.NONE, TextAnimation.TYPEWRITER, TextAnimation.BEAT_POP -> return null
            else -> FADE_SEC
        }
        val s = startSec.fmt()
        val e = endSec.fmt()
        // ramp up over `fade`, hold, ramp down over `fade`
        return "alpha='if(lt(t,$s+$fade),(t-$s)/$fade,if(lt(t,$e-$fade),1,max((($e)-t)/$fade,0)))'"
    }

    private fun buildAudioChain(
        project: AdProject,
        musicInputIndex: Int?,
        totalMs: Long,
        filters: MutableList<String>,
    ): String? {
        val audio = project.audio
        val keepOriginal = audio == null || audio.originalAudioVolume > 0f
        val clipsWithSound = project.clips.withIndex()
            .filter { (_, clip) -> (clip.asset as? MediaAsset.Video)?.hasAudio == true && clip.volume > 0f }

        var originalLabel: String? = null
        if (keepOriginal && clipsWithSound.isNotEmpty()) {
            clipsWithSound.forEach { (index, clip) ->
                val speed = clip.speedFactor
                val tempo = if (speed != 1f) ",${atempoChain(speed)}" else ""
                filters += "[$index:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo" +
                    "$tempo,volume=${clip.volume.fmt()}[ca$index]"
            }
            val inputs = clipsWithSound.joinToString("") { (index, _) -> "[ca$index]" }
            filters += "$inputs" + "concat=n=${clipsWithSound.size}:v=0:a=1[aorig]"
            originalLabel = "aorig"
        }

        var musicLabel: String? = null
        if (audio != null && musicInputIndex != null) {
            val fadeOutStart = ((totalMs - audio.fadeOutMs).coerceAtLeast(0L) / 1000.0).fmt()
            filters += "[$musicInputIndex:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo," +
                "volume=${audio.volume.fmt()}," +
                "afade=t=in:st=0:d=${(audio.fadeInMs / 1000.0).fmt()}," +
                "afade=t=out:st=$fadeOutStart:d=${(audio.fadeOutMs / 1000.0).fmt()}[amusic]"
            musicLabel = "amusic"
        }

        return when {
            musicLabel != null && originalLabel != null -> {
                val level = project.audio?.originalAudioVolume ?: 0f
                filters += "[$originalLabel]volume=${level.fmt()}[aducked]"
                // dropout_transition=0 keeps amix from pumping the music when the clip
                // audio ends before the bed does.
                filters += "[$musicLabel][aducked]amix=inputs=2:duration=longest:dropout_transition=0[aout]"
                "aout"
            }
            musicLabel != null -> musicLabel
            originalLabel != null -> originalLabel
            else -> null
        }
    }

    companion object {
        private const val FADE_SEC = "0.35"
        private const val SLIDE_SEC = "0.40"
        private const val SLIDE_PX = "60"

        /**
         * Start time of the k-th transition (1-based over clip joins), in ms:
         * `offset(k) = Σ d[0..k-1] − Σ overlap[1..k]`. Each earlier transition already
         * pulled the running timeline back by its own length, and the k-th one starts
         * exactly `overlap` before the outgoing clip's material runs out.
         *
         * This is the same walk as [AdProject.startOfClipMs]; it is duplicated here so the
         * filtergraph never silently drifts from the timeline the editor drew.
         */
        fun transitionOffsetMs(project: AdProject, joinIndex: Int): Long {
            var offset = 0L
            for (i in 0 until joinIndex) {
                offset += project.clips[i].durationMs - project.clips[i].effectiveTransitionMs(next = true)
            }
            return offset.coerceAtLeast(0L)
        }

        /**
         * `atempo` only accepts 0.5–2.0, so anything outside that range is expressed as a
         * chain of stages (4x = atempo=2.0,atempo=2.0).
         */
        fun atempoChain(factor: Float): String {
            var remaining = factor.toDouble()
            val stages = mutableListOf<String>()
            while (remaining > 2.0) {
                stages += "atempo=2.0"
                remaining /= 2.0
            }
            while (remaining < 0.5) {
                stages += "atempo=0.5"
                remaining /= 0.5
            }
            stages += "atempo=${String.format(Locale.US, "%.4f", remaining)}"
            return stages.joinToString(",")
        }

        /**
         * `drawtext` re-parses its value, so `:` `\` and `%` have to survive two levels of
         * unescaping. The apostrophe is the one character that cannot be escaped reliably
         * across FFmpeg versions — we substitute the typographic one rather than ship a
         * command that breaks on "Today's offer". Use `textfile=` to avoid all of this.
         */
        fun escapeDrawTextValue(raw: String): String = raw
            .replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("%", "\\%")
            .replace("'", "’")
            .replace("\n", "\\n")

        /** ARGB int → FFmpeg's `0xRRGGBB@A`. */
        fun Int.toFfmpegColor(): String {
            val alpha = (this ushr 24 and 0xFF) / 255f
            val rgb = this and 0xFFFFFF
            return "0x%06X@%.2f".format(Locale.US, rgb, alpha)
        }

        fun Long.asSeconds(): String = String.format(Locale.US, "%.3f", this / 1000.0)
        fun Float.fmt(decimals: Int = 3): String = String.format(Locale.US, "%.${decimals}f", this)
        fun Double.fmt(decimals: Int = 3): String = String.format(Locale.US, "%.${decimals}f", this)
    }
}
