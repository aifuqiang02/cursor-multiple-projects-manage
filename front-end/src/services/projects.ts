import api from './api'
import { ref, computed } from 'vue'
import { wsService } from '@/services/websocket'
import type { Task } from '@/services/tasks'

export interface Project {
  id: string
  name: string
  cursorKey?: string
  uuid: string
  status: 'active' | 'hidden'
  description?: string
  aiStatus?:
    | 'idle'
    | 'active'
    | 'running'
    | 'success'
    | 'failed'
    | 'warning'
    | 'completed'
    | 'aborted'
    | 'error'
  aiCommand?: string
  aiResult?: string
  aiDuration?: number
  aiStartedAt?: string
  aiCompletedAt?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    tasks: number
  }
}

export interface ProjectWithDetails extends Project {
  tasks: Task[]
}

export interface CreateProjectData {
  name: string
  cursorKey?: string
  description?: string
}

export interface UpdateProjectData {
  name?: string
  cursorKey?: string
  description?: string
  status?: 'active' | 'hidden'
}

export interface AIStatusUpdate {
  status:
    | 'idle'
    | 'active'
    | 'running'
    | 'success'
    | 'failed'
    | 'warning'
    | 'completed'
    | 'aborted'
    | 'error'
  command?: string
  result?: string
  duration?: number
}

// State management
const projects = ref<Project[]>([])
const currentProject = ref<ProjectWithDetails | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const activeProjects = computed(() => projects.value.filter((p) => p.status === 'active'))
const allProjects = computed(() => projects.value)
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

export const projectService = {
  // API methods
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/projects')
    return response.data.data
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await api.post('/projects', data)
    return response.data.data
  },

  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await api.put(`/projects/${id}`, data)
    return response.data.data
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },

  async getProjectDetails(id: string): Promise<ProjectWithDetails> {
    const response = await api.get(`/projects/${id}/details`)
    return response.data.project
  },

  async updateAIStatus(id: string, data: AIStatusUpdate): Promise<Project> {
    const response = await api.put(`/projects/${id}/ai-status`, data)
    return response.data.project
  },

  async getRunningAIProjects(): Promise<Project[]> {
    const response = await api.get('/projects/ai-status/running')
    return response.data.projects
  },

  async startAIExecution(id: string): Promise<Project> {
    const response = await api.post(`/projects/${id}/ai-status-start`)
    return response.data.data
  },

  async stopAIExecution(id: string, status: 'completed' | 'aborted' | 'error'): Promise<Project> {
    const response = await api.post(`/projects/${id}/ai-status-stop`, { status })
    return response.data.data
  },

  // Business logic methods
  async fetchProjects() {
    setLoading(true)
    setError(null)
    const data = await this.getProjects()
    console.log('Fetched projects from backend:', data)
    console.log('Total projects count:', data.length)
    console.log('Active projects:', data.filter((p) => p.status === 'active').length)
    console.log('Hidden projects:', data.filter((p) => p.status === 'hidden').length)
    projects.value = data
    setLoading(false)
  },

  async createProjectWithState(data: CreateProjectData) {
    setLoading(true)
    setError(null)
    const newProject = await this.createProject(data)
    projects.value.unshift(newProject)
    setLoading(false)
    return newProject
  },

  async updateProjectWithState(id: string, data: UpdateProjectData) {
    setLoading(true)
    setError(null)
    const updatedProject = await this.updateProject(id, data)

    // Update in projects list
    const index = projects.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updatedProject }
    }

    // Update current project if it's the same
    if (currentProject.value?.id === id) {
      currentProject.value = { ...currentProject.value, ...updatedProject }
    }

    setLoading(false)
    return updatedProject
  },

  async deleteProjectWithState(id: string) {
    setLoading(true)
    setError(null)
    await this.deleteProject(id)
    projects.value = projects.value.filter((p) => p.id !== id)

    // Clear current project if it's the deleted one
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
    setLoading(false)
  },

  async fetchProjectDetailsWithState(id: string) {
    setLoading(true)
    setError(null)
    const project = await this.getProjectDetails(id)
    currentProject.value = project
    setLoading(false)
    return project
  },

  async updateAIStatusWithState(id: string, data: AIStatusUpdate) {
    const updatedProject = await this.updateAIStatus(id, data)

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
  },

  async fetchRunningAIProjectsWithState() {
    const data = await this.getRunningAIProjects()
    // Update running status in projects list
    data.forEach((runningProject) => {
      if (!runningProject) return
      const index = projects.value.findIndex((p) => p.id === runningProject.id)
      if (index !== -1 && projects.value[index]) {
        projects.value[index].aiStatus = 'running'
      }
    })
  },

  async startAIExecutionWithState(id: string) {
    const updatedProject = await this.startAIExecution(id)
    // Update project in the list
    const index = projects.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updatedProject }
    }
    return updatedProject
  },

  async stopAIExecutionWithState(id: string, status: 'completed' | 'aborted' | 'error') {
    const updatedProject = await this.stopAIExecution(id, status)
    // Update project in the list
    const index = projects.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updatedProject }
    }
    return updatedProject
  },

  // WebSocket listeners
  setupWebSocketListeners() {
    console.log('[WebSocket] Setting up WebSocket listeners for AI status updates')

    wsService.on('ai-status-updated', (data) => {
      console.log('[WebSocket] Received ai-status-updated event:', data)

      const { projectId, ...statusData } = data
      console.log('[WebSocket] Extracted projectId:', projectId)
      console.log('[WebSocket] Status data:', statusData)

      // Update in projects list
      const index = projects.value.findIndex((p) => p.id === projectId)
      console.log('[WebSocket] Found project at index:', index, 'in projects list')

      if (index !== -1 && projects.value[index]) {
        const project = projects.value[index]
        console.log(
          '[WebSocket] Updating project in list:',
          project.name,
          'from status:',
          project.aiStatus,
          'to:',
          statusData.status,
        )

        const oldProject = { ...project }
        projects.value[index] = {
          ...project,
          aiStatus: statusData.status,
          aiCommand: statusData.command,
          aiResult: statusData.result,
          aiDuration: statusData.duration,
          aiStartedAt:
            statusData.status === 'running' ? new Date().toISOString() : project.aiStartedAt,
          aiCompletedAt: statusData.status !== 'running' ? new Date().toISOString() : null,
        }

        console.log(
          '[WebSocket] Project updated successfully. Old state:',
          oldProject.aiStatus,
          'New state:',
          projects.value[index].aiStatus,
        )
      } else {
        console.warn(
          '[WebSocket] Project not found in projects list or index is invalid:',
          projectId,
          index,
        )
      }

      // Update current project if it's the same
      if (currentProject.value && currentProject.value.id === projectId) {
        console.log('[WebSocket] Updating current project:', currentProject.value.name)
        console.log(
          '[WebSocket] Current project status before update:',
          currentProject.value.aiStatus,
        )

        const oldCurrentStatus = currentProject.value.aiStatus

        // Only update the fields that are being changed, preserve tasks and other fields
        Object.assign(currentProject.value, {
          aiStatus: statusData.status,
          aiCommand: statusData.command,
          aiResult: statusData.result,
          aiDuration: statusData.duration,
          aiStartedAt:
            statusData.status === 'running'
              ? new Date().toISOString()
              : currentProject.value.aiStartedAt,
          aiCompletedAt: statusData.status !== 'running' ? new Date().toISOString() : null,
        })

        console.log(
          '[WebSocket] Current project updated successfully. Status changed from:',
          oldCurrentStatus,
          'to:',
          currentProject.value.aiStatus,
        )
      } else {
        console.log(
          '[WebSocket] Current project does not match updated project or no current project set',
        )
        if (currentProject.value) {
          console.log(
            '[WebSocket] Current project ID:',
            currentProject.value.id,
            'Updated project ID:',
            projectId,
          )
        } else {
          console.log('[WebSocket] No current project is set')
        }
      }

      console.log('[WebSocket] AI status update processing completed for project:', projectId)
    })

    console.log('[WebSocket] WebSocket listeners setup completed')
  },
}

// Create aliases for easier importing
const fetchProjects = projectService.fetchProjects.bind(projectService)
const createProject = projectService.createProjectWithState.bind(projectService)
const updateProject = projectService.updateProjectWithState.bind(projectService)
const deleteProject = projectService.deleteProjectWithState.bind(projectService)
const fetchProjectDetails = projectService.fetchProjectDetailsWithState.bind(projectService)
const updateAIStatus = projectService.updateAIStatusWithState.bind(projectService)
const fetchRunningAIProjects = projectService.fetchRunningAIProjectsWithState.bind(projectService)
const startAIExecution = projectService.startAIExecutionWithState.bind(projectService)
const stopAIExecution = projectService.stopAIExecutionWithState.bind(projectService)
const setupWebSocketListeners = projectService.setupWebSocketListeners.bind(projectService)

// Export everything
export {
  // State
  projects,
  currentProject,
  loading,
  error,

  // Getters
  activeProjects,
  allProjects,
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
  startAIExecution,
  stopAIExecution,
  setupWebSocketListeners,
}
