import api from './api'

export interface Project {
  id: string
  name: string
  cursorKey?: string
  uuid: string
  status: 'active' | 'hidden'
  description?: string
  aiStatus?: 'idle' | 'active' | 'running' | 'success' | 'failed' | 'warning'
  aiCommand?: string
  aiResult?: string
  aiDuration?: number
  aiStartedAt?: string
  aiCompletedAt?: string
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
  status: 'idle' | 'active' | 'running' | 'success' | 'failed' | 'warning'
  command?: string
  result?: string
  duration?: number
}

export const projectService = {
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
}
