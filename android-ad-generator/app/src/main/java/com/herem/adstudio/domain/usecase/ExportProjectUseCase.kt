package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.repository.RenderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject

class ExportProjectUseCase @Inject constructor(
    private val renderRepository: RenderRepository,
) {
    operator fun invoke(project: AdProject): Flow<RenderProgress> =
        when (val reason = validate(project)) {
            null -> renderRepository.export(project)
            else -> flowOf(RenderProgress.Failed(reason))
        }

    /** Returns null when the project is renderable, or the reason it is not. */
    private fun validate(project: AdProject): String? = when {
        project.clips.isEmpty() -> "Add at least one photo or clip before exporting"
        project.totalDurationMs <= 0L -> "The timeline is empty"
        project.totalDurationMs > project.settings.preset.maxDurationMs ->
            "This edit is longer than ${project.settings.preset.displayName} allows " +
                "(${project.settings.preset.maxDurationMs / 1000}s)"
        else -> null
    }
}
