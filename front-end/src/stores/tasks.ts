import { defineStore } from 'pinia'
import { ref } from 'vue'
import { taskService, type Task, type CreateTaskData, type UpdateTaskData } from '@/services/tasks'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const fetchTasksByProject = async (projectId: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await taskService.getTasksByProject(projectId)
      tasks.value = data
      return data
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch tasks'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (data: CreateTaskData) => {
    try {
      setLoading(true)
      setError(null)
      const newTask = await taskService.createTask(data)
      tasks.value.unshift(newTask)
      return newTask
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create task'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateTask = async (id: string, data: UpdateTaskData) => {
    try {
      setLoading(true)
      setError(null)
      const updatedTask = await taskService.updateTask(id, data)

      // Update in tasks list
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update task'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await taskService.deleteTask(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete task'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateTaskOrder = async (id: string, order: number) => {
    try {
      const updatedTask = await taskService.updateTaskOrder(id, order)

      // Update in tasks list
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update task order'
      setError(message)
      throw err
    }
  }

  // Computed properties for filtering
  const pendingTasks = () => tasks.value.filter(t => t.status === 'pending')
  const inProgressTasks = () => tasks.value.filter(t => t.status === 'in_progress')
  const completedTasks = () => tasks.value.filter(t => t.status === 'completed')

  // Sort tasks by priority and order
  const sortedTasks = () => {
    return [...tasks.value].sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order
      }
      // Finally by creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  return {
    // State
    tasks,
    loading,
    error,

    // Actions
    fetchTasksByProject,
    createTask,
    updateTask,
    deleteTask,
    updateTaskOrder,

    // Computed
    pendingTasks,
    inProgressTasks,
    completedTasks,
    sortedTasks
  }
})
