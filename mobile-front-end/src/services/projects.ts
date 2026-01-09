import api from './api'
import { ref, computed } from 'vue'

export interface Project {
  id: string
  name: string
  cursorKey?: string
  uuid: string
  status: 'active' | 'hidden'
  description?: string
  aiStatus?: 'idle' | 'active' | 'running' | 'success' | 'failed' | 'warning' | 'completed' | 'aborted' | 'error'
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

// State management
const projects = ref<Project[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const activeProjects = computed(() => projects.value.filter((p) => p.status === 'active'))
const allProjects = computed(() => projects.value)

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

  // Business logic methods
  async fetchProjects() {
    setLoading(true)
    setError(null)
    try {
      const data = await this.getProjects()
      console.log('Fetched projects from backend:', data)
      projects.value = data
      setLoading(false)
      return data
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('获取项目列表失败')
      setLoading(false)
      throw err
    }
  },

  async createProjectWithState(data: CreateProjectData) {
    setLoading(true)
    setError(null)
    try {
      const newProject = await this.createProject(data)
      projects.value.unshift(newProject)
      setLoading(false)
      return newProject
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('创建项目失败')
      setLoading(false)
      throw err
    }
  },

  async updateProjectWithState(id: string, data: UpdateProjectData) {
    setLoading(true)
    setError(null)
    try {
      const updatedProject = await this.updateProject(id, data)

      // Update in projects list
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...updatedProject }
      }

      setLoading(false)
      return updatedProject
    } catch (err) {
      console.error('Failed to update project:', err)
      setError('更新项目失败')
      setLoading(false)
      throw err
    }
  },

  async deleteProjectWithState(id: string) {
    setLoading(true)
    setError(null)
    try {
      await this.deleteProject(id)
      projects.value = projects.value.filter((p) => p.id !== id)
      setLoading(false)
    } catch (err) {
      console.error('Failed to delete project:', err)
      setError('删除项目失败')
      setLoading(false)
      throw err
    }
  },
}

// Create aliases for easier importing
const fetchProjects = projectService.fetchProjects.bind(projectService)
const createProject = projectService.createProjectWithState.bind(projectService)
const updateProject = projectService.updateProjectWithState.bind(projectService)
const deleteProject = projectService.deleteProjectWithState.bind(projectService)

// Export everything
export {
  // State
  projects,
  loading,
  error,

  // Getters
  activeProjects,
  allProjects,

  // Actions
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
}
