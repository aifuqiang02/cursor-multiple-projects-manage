import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  projectService,
  type Project,
  type ProjectWithDetails,
  type CreateProjectData,
  type UpdateProjectData,
  type AIStatusUpdate,
} from '@/services/projects'
import { wsService } from '@/services/websocket'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<ProjectWithDetails | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeProjects = computed(() => projects.value.filter((p) => p.status === 'active'))

  const runningAIProjects = computed(() => projects.value.filter((p) => p.aiStatus === 'running'))

  const totalTasks = computed(() =>
    projects.value.reduce((sum, project) => sum + (project._count?.tasks || 0), 0),
  )

  // Actions
  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await projectService.getProjects()
      console.log('Fetched projects from backend:', data)
      console.log('Total projects count:', data.length)
      console.log('Active projects:', data.filter(p => p.status === 'active').length)
      console.log('Hidden projects:', data.filter(p => p.status === 'hidden').length)
      projects.value = data
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch projects'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (data: CreateProjectData) => {
    try {
      setLoading(true)
      setError(null)
      const newProject = await projectService.createProject(data)
      projects.value.unshift(newProject)
      return newProject
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create project'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateProject = async (id: string, data: UpdateProjectData) => {
    try {
      setLoading(true)
      setError(null)
      const updatedProject = await projectService.updateProject(id, data)

      // Update in projects list
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...updatedProject }
      }

      // Update current project if it's the same
      if (currentProject.value?.id === id) {
        currentProject.value = { ...currentProject.value, ...updatedProject }
      }

      return updatedProject
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update project'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await projectService.deleteProject(id)
      projects.value = projects.value.filter((p) => p.id !== id)

      // Clear current project if it's the deleted one
      if (currentProject.value?.id === id) {
        currentProject.value = null
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete project'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectDetails = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const project = await projectService.getProjectDetails(id)
      currentProject.value = project
      return project
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch project details'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateAIStatus = async (id: string, data: AIStatusUpdate) => {
    try {
      const updatedProject = await projectService.updateAIStatus(id, data)

      // Update in projects list
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...updatedProject }
      }

      // Update current project if it's the same
      if (currentProject.value?.id === id) {
        currentProject.value = { ...currentProject.value, ...updatedProject }
      }

      // Broadcast via WebSocket
      wsService.emit('ai-status-update', { projectId: id, ...data })

      return updatedProject
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update AI status'
      setError(message)
      throw err
    }
  }

  const fetchRunningAIProjects = async () => {
    try {
      const data = await projectService.getRunningAIProjects()
      // Update running status in projects list
      data.forEach((runningProject) => {
        const index = projects.value.findIndex((p) => p.id === runningProject.id)
        if (index !== -1) {
          projects.value[index].aiStatus = 'running'
        }
      })
    } catch (err: any) {
      console.error('Failed to fetch running AI projects:', err)
    }
  }

  // WebSocket listeners
  const setupWebSocketListeners = () => {
    wsService.on('ai-status-updated', (data) => {
      const { projectId, ...statusData } = data

      // Update in projects list
      const index = projects.value.findIndex((p) => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = {
          ...projects.value[index],
          aiStatus: statusData.status,
          aiCommand: statusData.command,
          aiResult: statusData.result,
          aiDuration: statusData.duration,
          aiStartedAt:
            statusData.status === 'running'
              ? new Date().toISOString()
              : projects.value[index].aiStartedAt,
          aiCompletedAt: statusData.status !== 'running' ? new Date().toISOString() : null,
        }
      }

      // Update current project if it's the same
      if (currentProject.value?.id === projectId) {
        currentProject.value = {
          ...currentProject.value,
          aiStatus: statusData.status,
          aiCommand: statusData.command,
          aiResult: statusData.result,
          aiDuration: statusData.duration,
          aiStartedAt:
            statusData.status === 'running'
              ? new Date().toISOString()
              : currentProject.value.aiStartedAt,
          aiCompletedAt: statusData.status !== 'running' ? new Date().toISOString() : null,
        }
      }
    })
  }

  return {
    // State
    projects,
    currentProject,
    loading,
    error,

    // Getters
    activeProjects,
    runningAIProjects,
    totalTasks,

    // Actions
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    fetchProjectDetails,
    updateAIStatus,
    fetchRunningAIProjects,
    setupWebSocketListeners,
  }
})
