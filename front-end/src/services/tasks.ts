import api from './api'

export interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: number // 1-5, 1 is highest
  order?: number
  createdAt: string
  updatedAt: string
  projectId: string
}

export interface CreateTaskData {
  title: string
  projectId: string
  priority?: number
}

export interface UpdateTaskData {
  title?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: number
  order?: number
}

export const taskService = {
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const response = await api.get(`/tasks/project/${projectId}`)
    return response.data.data
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await api.post('/tasks', data)
    return response.data.data
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data.data
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  async updateTaskOrder(id: string, order: number): Promise<Task> {
    const response = await api.put(`/tasks/${id}/order`, { order })
    return response.data.data
  },
}
