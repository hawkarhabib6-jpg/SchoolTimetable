package com.herem.adstudio.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.herem.adstudio.core.util.formatTimecode
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.TransitionType

/**
 * The clip strip. Thumbnail width is proportional to duration (clamped), so the timeline
 * reads as a time axis rather than a uniform carousel, and the transition badge sits *in
 * the seam* between two clips — the place users tap when they think "change this join".
 */
@Composable
fun Timeline(
    clips: List<Clip>,
    selectedClipId: String?,
    totalDurationMs: Long,
    onClipSelected: (String) -> Unit,
    onAddMedia: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LazyRow(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            itemsIndexed(clips, key = { _, clip -> clip.id }) { index, clip ->
                ClipThumbnail(
                    clip = clip,
                    isSelected = clip.id == selectedClipId,
                    totalDurationMs = totalDurationMs,
                    onClick = { onClipSelected(clip.id) },
                )
                if (index != clips.lastIndex) {
                    TransitionBadge(clip.transitionToNext, onClick = { onClipSelected(clip.id) })
                }
            }
        }

        Box(
            modifier = Modifier
                .padding(horizontal = 12.dp)
                .size(44.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer)
                .clickable(onClick = onAddMedia),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Add,
                contentDescription = "Add media",
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun ClipThumbnail(
    clip: Clip,
    isSelected: Boolean,
    totalDurationMs: Long,
    onClick: () -> Unit,
) {
    val share = if (totalDurationMs <= 0L) 0f else clip.durationMs.toFloat() / totalDurationMs
    val width = (MIN_CLIP_WIDTH_DP + share * WIDTH_RANGE_DP).dp.coerceAtMost(MAX_CLIP_WIDTH_DP.dp)

    Box(
        modifier = Modifier
            .padding(vertical = 8.dp)
            .width(width)
            .height(64.dp)
            .clip(RoundedCornerShape(8.dp))
            .border(
                width = if (isSelected) 2.dp else 0.dp,
                color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                shape = RoundedCornerShape(8.dp),
            )
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = clip.asset.uri,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().height(64.dp),
        )
        Text(
            text = clip.durationMs.formatTimecode(),
            color = Color.White,
            fontSize = 10.sp,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(3.dp)
                .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(4.dp))
                .padding(horizontal = 4.dp, vertical = 1.dp),
        )
    }
}

@Composable
private fun TransitionBadge(type: TransitionType, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .padding(horizontal = 3.dp)
            .size(width = 26.dp, height = 26.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = if (type == TransitionType.CUT) "|" else "⋈",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 12.sp,
        )
    }
}

private const val MIN_CLIP_WIDTH_DP = 56f
private const val WIDTH_RANGE_DP = 180f
private const val MAX_CLIP_WIDTH_DP = 140f
