package com.herem.adstudio.data.media

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.repository.MediaRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ioDispatcher: CoroutineDispatcher,
) : MediaRepository {

    override suspend fun probe(uri: String): Result<MediaAsset> = withContext(ioDispatcher) {
        runCatching {
            val parsed = Uri.parse(uri)
            val mime = context.contentResolver.getType(parsed).orEmpty()
            if (mime.startsWith("image/")) probeImage(parsed, uri) else probeVideo(parsed, uri)
        }
    }

    override suspend fun probeAll(uris: List<String>): List<MediaAsset> =
        uris.mapNotNull { probe(it).getOrNull() }

    override fun newOutputPath(projectName: String): String {
        val dir = File(context.cacheDir, "renders").apply { mkdirs() }
        val safe = projectName.ifBlank { "ad" }
            .replace(Regex("[^A-Za-z0-9._-]"), "_")
            .take(40)
        return File(dir, "${safe}_${System.currentTimeMillis()}.mp4").absolutePath
    }

    private fun probeImage(parsed: Uri, uri: String): MediaAsset.Image {
        val options = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(parsed).use { stream ->
            android.graphics.BitmapFactory.decodeStream(stream, null, options)
        }
        return MediaAsset.Image(
            id = UUID.randomUUID().toString(),
            uri = uri,
            widthPx = options.outWidth.coerceAtLeast(0),
            heightPx = options.outHeight.coerceAtLeast(0),
        )
    }

    private fun probeVideo(parsed: Uri, uri: String): MediaAsset.Video {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, parsed)
            fun meta(key: Int) = retriever.extractMetadata(key)?.toIntOrNull() ?: 0
            val rotation = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
            val rawWidth = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
            val rawHeight = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
            // A portrait phone video is usually stored landscape with rotation metadata;
            // swapping here means the rest of the app can trust width/height.
            val swap = rotation == 90 || rotation == 270
            return MediaAsset.Video(
                id = UUID.randomUUID().toString(),
                uri = uri,
                widthPx = if (swap) rawHeight else rawWidth,
                heightPx = if (swap) rawWidth else rawHeight,
                durationMs = retriever
                    .extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    ?.toLongOrNull() ?: 0L,
                hasAudio = retriever
                    .extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes",
                rotationDegrees = rotation,
            )
        } finally {
            retriever.release()
        }
    }
}
