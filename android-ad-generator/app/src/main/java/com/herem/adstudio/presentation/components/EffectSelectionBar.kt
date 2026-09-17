package com.herem.adstudio.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ColorFilter
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.TransitionType
import com.herem.adstudio.presentation.editor.EditorTool
import com.herem.adstudio.presentation.editor.EditorAction

/**
 * The bottom control surface: a tool row, and under it the options for the active tool.
 *
 * Design decisions worth keeping if you rework it:
 *
 * - **One row of chips, always horizontally scrollable.** Effects are browsed, not
 *   searched; a grid would push the canvas off-screen on a 5" phone.
 * - **Every chip is an immediate, undoable edit.** There is no "apply" button: the user
 *   taps, sees it on the canvas, taps another. The ViewModel's undo stack is what makes
 *   that safe, and it is why every option here emits an [EditorAction] rather than
 *   mutating anything locally.
 * - **Selection state comes from the clip, not from the bar.** Re-selecting a clip
 *   re-renders the correct chip as active with no extra bookkeeping.
 */
@Composable
fun EffectSelectionBar(
    activeTool: EditorTool,
    selectedClip: Clip?,
    beatSnapEnabled: Boolean,
    beatSnapAvailable: Boolean,
    onAction: (EditorAction) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface),
    ) {
        ToolRow(activeTool = activeTool, onToolSelected = { onAction(EditorAction.SelectTool(it)) })

        AnimatedContent(
            targetState = activeTool,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "tool-options",
        ) { tool ->
            Box(Modifier.padding(vertical = 10.dp)) {
                when (tool) {
                    EditorTool.TRANSITIONS -> TransitionOptions(selectedClip, onAction)
                    EditorTool.EFFECTS -> EffectOptions(selectedClip, onAction)
                    EditorTool.SPEED -> SpeedOptions(selectedClip, onAction)
                    EditorTool.TEXT -> TextOptions(onAction)
                    EditorTool.AUDIO -> AudioOptions(beatSnapEnabled, beatSnapAvailable, onAction)
                }
            }
        }
    }
}

@Composable
private fun ToolRow(activeTool: EditorTool, onToolSelected: (EditorTool) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        EditorTool.entries.forEach { tool ->
            ToolButton(
                tool = tool,
                isActive = tool == activeTool,
                onClick = { onToolSelected(tool) },
            )
        }
    }
}

@Composable
private fun ToolButton(tool: EditorTool, isActive: Boolean, onClick: () -> Unit) {
    val tint = if (isActive) MaterialTheme.colorScheme.primary
    else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp),
    ) {
        Icon(imageVector = tool.icon, contentDescription = tool.label, tint = tint)
        Text(text = tool.label, color = tint, fontSize = 11.sp)
    }
}

@Composable
private fun TransitionOptions(clip: Clip?, onAction: (EditorAction) -> Unit) {
    OptionRow(
        items = TransitionType.entries,
        keyOf = { it.name },
        isSelected = { it == clip?.transitionToNext },
        labelOf = { it.label },
        enabled = clip != null,
        onClick = { onAction(EditorAction.SetTransition(it)) },
    )
}

@Composable
private fun EffectOptions(clip: Clip?, onAction: (EditorAction) -> Unit) {
    Column {
        OptionRow(
            items = ColorFilter.entries,
            keyOf = { it.name },
            isSelected = { it == clip?.colorFilter },
            labelOf = { it.label },
            enabled = clip != null,
            onClick = { onAction(EditorAction.SetColorFilter(it)) },
        )
        OptionRow(
            items = MotionEffect.entries,
            keyOf = { it.name },
            isSelected = { it == clip?.motionEffect },
            labelOf = { it.label },
            enabled = clip != null,
            onClick = { onAction(EditorAction.SetMotion(it)) },
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun SpeedOptions(clip: Clip?, onAction: (EditorAction) -> Unit) {
    Column(Modifier.padding(horizontal = 20.dp)) {
        val speed = clip?.speedFactor ?: 1f
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Speed", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Text("%.2fx".format(speed), color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp)
        }
        Slider(
            value = speed,
            onValueChange = { onAction(EditorAction.SetSpeed(it)) },
            valueRange = Clip.MIN_SPEED..Clip.MAX_SPEED,
            enabled = clip != null && !clip.isImage,
        )
        // Velocity presets — the "velocity edit" look is just a few hard jumps in a row.
        OptionRow(
            items = listOf(0.5f, 1f, 1.5f, 2f, 3f),
            keyOf = { "speed-$it" },
            isSelected = { it == speed },
            labelOf = { "%.1fx".format(it) },
            enabled = clip != null && !clip.isImage,
            onClick = { onAction(EditorAction.SetSpeed(it)) },
        )
    }
}

@Composable
private fun TextOptions(onAction: (EditorAction) -> Unit) {
    OptionRow(
        items = CTA_SUGGESTIONS,
        keyOf = { it },
        isSelected = { false },
        labelOf = { it },
        enabled = true,
        onClick = { onAction(EditorAction.AddText(it)) },
    )
}

@Composable
private fun AudioOptions(
    beatSnapEnabled: Boolean,
    beatSnapAvailable: Boolean,
    onAction: (EditorAction) -> Unit,
) {
    Column(Modifier.padding(horizontal = 20.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onAction(EditorAction.PickMusic) }
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Background music", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
            Text("Choose", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.padding(end = 12.dp)) {
                Text("Snap cuts to the beat", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
                Text(
                    text = if (beatSnapAvailable) "Detected a steady tempo"
                    else "Add music with a clear beat first",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Switch(
                checked = beatSnapEnabled,
                onCheckedChange = { onAction(EditorAction.SetBeatSnap(it)) },
                enabled = beatSnapAvailable,
            )
        }
    }
}

/**
 * The one chip row used by every tool: generic over the option type so adding a tool never
 * means re-implementing selection, spacing or the disabled look.
 */
@Composable
private fun <T> OptionRow(
    items: List<T>,
    keyOf: (T) -> Any,
    isSelected: (T) -> Boolean,
    labelOf: (T) -> String,
    enabled: Boolean,
    onClick: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(items = items, key = keyOf) { item ->
            OptionChip(
                label = labelOf(item),
                selected = isSelected(item),
                enabled = enabled,
                onClick = { onClick(item) },
            )
        }
    }
}

@Composable
private fun OptionChip(label: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val background = when {
        !enabled -> colors.surfaceVariant.copy(alpha = 0.4f)
        selected -> colors.primaryContainer
        else -> colors.surfaceVariant
    }
    val content = when {
        !enabled -> colors.onSurfaceVariant.copy(alpha = 0.4f)
        selected -> colors.onPrimaryContainer
        else -> colors.onSurfaceVariant
    }
    Box(
        modifier = Modifier
            .height(38.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = content,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val CTA_SUGGESTIONS = listOf(
    "Order now",
    "50% OFF",
    "Free delivery",
    "Limited offer",
    "Swipe up",
    "DM to order",
)
