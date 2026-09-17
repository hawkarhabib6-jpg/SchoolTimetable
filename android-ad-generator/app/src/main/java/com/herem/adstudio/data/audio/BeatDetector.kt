package com.herem.adstudio.data.audio

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import com.herem.adstudio.domain.model.BeatMap
import com.herem.adstudio.domain.repository.AudioRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.coroutines.coroutineContext
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Onset detection over the decoded PCM of a music file: the input to beat-synced cuts
 * ([com.herem.adstudio.domain.usecase.SnapCutsToBeatUseCase]) and to "beat pop" text.
 *
 * Deliberately a plain energy-flux detector rather than an ML tempo model:
 *  - it runs in well under a second for a 3-minute track on a mid-range phone,
 *  - it needs no model file in the APK,
 *  - and it is accurate enough for the four-on-the-floor music people actually put under
 *    product ads. For sparse or rubato material the confidence score comes out low, which
 *    is the signal the UI uses to leave "snap to beat" switched off.
 *
 * Pipeline: decode → mono RMS per [HOP_SAMPLES] hop → positive energy flux → adaptive
 * median threshold → peak pick with a refractory gap → tempo from the inter-onset median.
 */
@Singleton
class BeatDetector @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ioDispatcher: CoroutineDispatcher,
) : AudioRepository {

    override suspend fun detectBeats(uri: String): Result<BeatMap> = withContext(ioDispatcher) {
        runCatching {
            val (envelope, hopMs) = decodeEnvelope(Uri.parse(uri))
            if (envelope.size < MIN_FRAMES) return@runCatching BeatMap.EMPTY
            val onsets = pickOnsets(envelope, hopMs)
            BeatMap(
                bpm = estimateBpm(onsets),
                beatsMs = onsets,
                confidence = confidenceOf(onsets),
            )
        }
    }

    /** @return the per-hop RMS envelope and how many milliseconds one hop covers. */
    private suspend fun decodeEnvelope(uri: Uri): Pair<FloatArray, Double> {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            extractor.setDataSource(context, uri, null)
            val trackIndex = (0 until extractor.trackCount).firstOrNull { index ->
                extractor.getTrackFormat(index)
                    .getString(MediaFormat.KEY_MIME)
                    ?.startsWith("audio/") == true
            } ?: error("No audio track in $uri")

            extractor.selectTrack(trackIndex)
            val format = extractor.getTrackFormat(trackIndex)
            val mime = requireNotNull(format.getString(MediaFormat.KEY_MIME))
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)

            codec = MediaCodec.createDecoderByType(mime).apply {
                configure(format, null, null, 0)
                start()
            }

            val envelope = ArrayList<Float>(4096)
            val info = MediaCodec.BufferInfo()
            var sumSquares = 0.0
            var samplesInHop = 0
            var inputDone = false

            while (true) {
                coroutineContext.ensureActive()

                if (!inputDone) {
                    val inIndex = codec.dequeueInputBuffer(TIMEOUT_US)
                    if (inIndex >= 0) {
                        val buffer = codec.getInputBuffer(inIndex)!!
                        val size = extractor.readSampleData(buffer, 0)
                        if (size < 0) {
                            codec.queueInputBuffer(
                                inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                            )
                            inputDone = true
                        } else {
                            codec.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                val outIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US)
                if (outIndex >= 0) {
                    val output = codec.getOutputBuffer(outIndex)
                    if (output != null && info.size > 0) {
                        val shorts = output.order(ByteOrder.nativeOrder()).asShortBuffer()
                        var i = 0
                        while (i < shorts.limit()) {
                            // Down-mix to mono: the beat is in the sum, not in the stereo image.
                            var frame = 0.0
                            for (c in 0 until channels) {
                                if (i + c < shorts.limit()) frame += shorts.get(i + c) / 32768.0
                            }
                            frame /= channels
                            sumSquares += frame * frame
                            samplesInHop++
                            if (samplesInHop >= HOP_SAMPLES) {
                                envelope.add(sqrt(sumSquares / samplesInHop).toFloat())
                                sumSquares = 0.0
                                samplesInHop = 0
                            }
                            i += channels
                        }
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
                } else if (outIndex == MediaCodec.INFO_TRY_AGAIN_LATER && inputDone) {
                    break
                }
            }

            val hopMs = HOP_SAMPLES * 1000.0 / sampleRate
            return envelope.toFloatArray() to hopMs
        } finally {
            runCatching { codec?.stop() }
            runCatching { codec?.release() }
            extractor.release()
        }
    }

    /**
     * Positive energy flux, thresholded against a moving median. A fixed threshold would
     * either miss the quiet intro or fire on every hi-hat once the drop lands.
     */
    private fun pickOnsets(envelope: FloatArray, hopMs: Double): List<Long> {
        val flux = FloatArray(envelope.size)
        for (i in 1 until envelope.size) {
            flux[i] = max(0f, envelope[i] - envelope[i - 1])
        }

        val onsets = mutableListOf<Long>()
        val refractoryHops = (MIN_BEAT_GAP_MS / hopMs).toInt().coerceAtLeast(1)
        var lastOnset = -refractoryHops

        val window = (MEDIAN_WINDOW_MS / hopMs).toInt().coerceAtLeast(8)
        for (i in 1 until flux.size - 1) {
            val from = (i - window).coerceAtLeast(0)
            val to = (i + window).coerceAtMost(flux.size - 1)
            val local = flux.copyOfRange(from, to).sortedArray()
            val median = local[local.size / 2]
            val threshold = median * MEDIAN_MULTIPLIER + FLOOR

            val isPeak = flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]
            if (isPeak && flux[i] > threshold && i - lastOnset >= refractoryHops) {
                onsets += (i * hopMs).toLong()
                lastOnset = i
            }
        }
        return onsets
    }

    /** Median inter-onset interval → BPM, folded into a musical 60–180 range. */
    private fun estimateBpm(onsets: List<Long>): Float {
        if (onsets.size < 4) return 0f
        val intervals = onsets.zipWithNext { a, b -> b - a }.sorted()
        val median = intervals[intervals.size / 2].toFloat()
        if (median <= 0f) return 0f
        var bpm = 60_000f / median
        while (bpm < 60f) bpm *= 2f
        while (bpm > 180f) bpm /= 2f
        return bpm
    }

    /**
     * How regular the onsets are: 1f for a metronome, near 0f for speech or ambience.
     * The editor only offers automatic beat-snapping above [MIN_USABLE_CONFIDENCE].
     */
    private fun confidenceOf(onsets: List<Long>): Float {
        if (onsets.size < 4) return 0f
        val intervals = onsets.zipWithNext { a, b -> (b - a).toFloat() }
        val mean = intervals.average().toFloat()
        if (mean <= 0f) return 0f
        val deviation = intervals.map { abs(it - mean) }.average().toFloat()
        return (1f - (deviation / mean)).coerceIn(0f, 1f)
    }

    private companion object {
        const val TIMEOUT_US = 10_000L
        const val HOP_SAMPLES = 512
        const val MIN_FRAMES = 32
        const val MIN_BEAT_GAP_MS = 180.0
        const val MEDIAN_WINDOW_MS = 800.0
        const val MEDIAN_MULTIPLIER = 1.6f
        const val FLOOR = 0.008f
    }
}
