package com.herem.adstudio.domain.repository

import com.herem.adstudio.domain.model.AdProject
import kotlinx.coroutines.flow.Flow

interface ProjectRepository {
    fun observe(projectId: String): Flow<AdProject?>
    suspend fun save(project: AdProject)
    suspend fun delete(projectId: String)
    fun observeAll(): Flow<List<AdProject>>
}
