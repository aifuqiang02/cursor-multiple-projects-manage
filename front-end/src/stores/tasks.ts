import { defineStore } from 'pinia'
import { ref } from 'vue'
import { taskService, type Task, type CreateTaskData, type UpdateTaskData } from '@/services/tasks'
import { useProjectsStore } from '@/stores/projects'

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
      // Remove existing tasks for this project and add new ones
      tasks.value = tasks.value.filter((task) => task.projectId !== projectId)
      tasks.value.push(...data)
      return data
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to fetch tasks'
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

      // Update task count in projects store
      const projectsStore = useProjectsStore()
      const projectIndex = projectsStore.projects.findIndex((p) => p.id === data.projectId)
      if (projectIndex !== -1) {
        const project = projectsStore.projects[projectIndex]
        if (project) {
          if (project._count) {
            project._count.tasks += 1
          } else {
            project._count = { tasks: 1 }
          }
        }
      }

      return newTask
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'Failed to create task'
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
      const index = tasks.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update task'
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

      // Get the task before deleting it to know which project it belongs to
      const taskToDelete = tasks.value.find((t) => t.id === id)
      const projectId = taskToDelete?.projectId

      await taskService.deleteTask(id)
      tasks.value = tasks.value.filter((t) => t.id !== id)

      // Update task count in projects store
      if (projectId) {
        const projectsStore = useProjectsStore()
        const projectIndex = projectsStore.projects.findIndex((p) => p.id === projectId)
        if (projectIndex !== -1) {
          const project = projectsStore.projects[projectIndex]
          if (project && project._count && project._count.tasks > 0) {
            project._count.tasks -= 1
          }
        }
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'Failed to delete task'
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
      const index = tasks.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update task order'
      setError(message)
      throw err
    }
  }

  // Clear all tasks (useful when switching projects)
  const clearTasks = () => {
    tasks.value = []
  }

  // Computed properties for filtering
  const pendingTasks = () => tasks.value.filter((t) => t.status === 'pending')
  const inProgressTasks = () => tasks.value.filter((t) => t.status === 'in_progress')
  const completedTasks = () => tasks.value.filter((t) => t.status === 'completed')

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
    sortedTasks,

    // Utility methods
    clearTasks,
  }
})
