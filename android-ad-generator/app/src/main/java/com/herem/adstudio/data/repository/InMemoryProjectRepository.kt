package com.herem.adstudio.data.repository

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.repository.ProjectRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Process-lifetime project store.
 *
 * Deliberately the simplest thing that satisfies [ProjectRepository]: the editor, the undo
 * stack and the render pipeline all work against the interface, so swapping this for the
 * Room implementation (entities + a `ProjectDao`, converters for the clip/overlay lists)
 * is a one-binding change in `DataModule` and touches nothing above it. Until that lands,
 * a project does not survive process death.
 */
@Singleton
class InMemoryProjectRepository @Inject constructor() : ProjectRepository {

    private val projects = MutableStateFlow<Map<String, AdProject>>(emptyMap())

    override fun observe(projectId: String): Flow<AdProject?> =
        projects.asStateFlow().map { it[projectId] }

    override fun observeAll(): Flow<List<AdProject>> =
        projects.asStateFlow().map { snapshot ->
            snapshot.values.sortedByDescending { it.updatedAtMs }
        }

    override suspend fun save(project: AdProject) {
        projects.update { it + (project.id to project.copy(updatedAtMs = System.currentTimeMillis())) }
    }

    override suspend fun delete(projectId: String) {
        projects.update { it - projectId }
    }
}
