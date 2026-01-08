<template>
  <div class="home-container">
    <!-- Header -->
    <header class="header" v-if="showHeader">
      <div class="header-content">
        <h1 class="title">Cursor项目管理器</h1>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateProject = true">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
          <el-button @click="handleLogout" type="text"> 退出登录 </el-button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Projects List -->
        <div class="projects-section">
          <div class="section-header" v-if="showHeader">
            <h2>项目列表</h2>
            <div class="stats">
              <el-tag type="success">{{ activatedProjects.length }} 个激活项目</el-tag>
              <el-tag type="warning">{{ runningAIProjects.length }} 个AI运行中</el-tag>
              <el-tag type="info">{{ allProjects.length }} 个项目</el-tag>
              <el-tag type="primary">{{ totalTasks }} 个任务</el-tag>
            </div>
          </div>

          <div class="projects-grid">
            <el-card
              v-for="project in allProjects"
              :key="project.id"
              class="project-card"
              :class="{ 'current-project': currentProject?.id === project.id }"
            >
              <div class="project-header">
                <div class="project-title-section">
                  <h3>{{ project.name }}</h3>
                  <el-tag
                    :type="getProjectStatusType(project)"
                    size="small"
                    style="cursor: pointer"
                    @click="toggleProjectActivation(project)"
                  >
                    {{ getProjectStatusText(project) }}
                  </el-tag>
                  <el-tag
                    type=""
                    size="small"
                    style="cursor: pointer"
                    @click="toggleAIExecution(project)"
                  >
                    <span v-if="project.aiStatus === 'running'" class="ai-loading">
                      <el-icon class="is-loading">
                        <Loading />
                      </el-icon>
                      AI
                    </span>
                    <span v-else-if="project.aiStatus === 'success'">
                      <el-icon><Check /></el-icon>
                      AI
                    </span>
                    <span v-else-if="project.aiStatus === 'failed'">
                      <el-icon><Close /></el-icon>
                      AI
                    </span>
                    <span v-else-if="project.aiStatus === 'warning'">
                      <el-icon><Warning /></el-icon>
                      AI
                    </span>
                    <span v-else>AI</span>
                  </el-tag>
                </div>

                <div class="project-meta">
                  <span class="task-count">
                    <el-icon><Document /></el-icon>
                    {{ project._count?.tasks || 0 }} 个任务
                  </span>
                  <span class="cursor-key" v-if="project.cursorKey">
                    密钥: {{ project.cursorKey.slice(0, 8) }}...
                  </span>
                </div>

                <div class="project-actions">
                  <el-dropdown
                    @command="(action: string) => handleProjectAction(project, action)"
                    class="project-actions-dropdown"
                  >
                    <el-button size="small">
                      操作
                      <el-icon class="el-icon--right">
                        <arrow-down />
                      </el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="action in projectActions.filter((a) => a.value !== 'delete')"
                          :key="action.value"
                          :command="action.value"
                        >
                          {{ action.label }}
                        </el-dropdown-item>
                        <el-dropdown-item :command="'delete'" class="delete-item">
                          {{ projectActions.find((a) => a.value === 'delete')?.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>

              <p class="project-desc" v-if="project.description">
                {{ project.description }}
              </p>

              <!-- Quick Task Input -->
              <div class="quick-task-input">
                <el-input
                  v-model="quickTaskInputs[project.id]"
                  placeholder="输入任务内容，按回车创建"
                  size="small"
                  clearable
                  type="textarea"
                  :rows="1"
                  :autosize="{ minRows: 1, maxRows: 4 }"
                  @keyup.enter="createQuickTask(project)"
                  :disabled="tasksStore.loading"
                >
                  <template #suffix>
                    <el-icon @click="createQuickTask(project)">
                      <Plus />
                    </el-icon>
                  </template>
                </el-input>
              </div>

              <!-- Project Tasks -->
              <div class="project-tasks" v-if="getProjectTasks(project.id).length > 0">
                <div class="tasks-divider"></div>
                <draggable
                  :list="getDisplayedTasks(project.id)"
                  :group="{ name: 'tasks', pull: false, put: false }"
                  @change="onTaskOrderChange($event, project.id)"
                  :animation="200"
                  handle=".drag-handle"
                  class="tasks-list"
                  item-key="id"
                >
                  <template #item="{ element: task }">
                    <div class="task-item" :class="getTaskStatusClass(task.status)">
                      <div class="drag-handle">
                        <el-icon><Rank /></el-icon>
                      </div>
                      <span class="task-title" @click="copyTaskTitle(task.title)">{{
                        task.title
                      }}</span>
                      <div class="task-meta">
                        <el-dropdown
                          @command="(status: string) => updateTaskStatus(task, status)"
                          class="task-status-dropdown"
                        >
                          <span class="task-status">
                            {{ getStatusText(task.status) }}
                            <el-icon class="el-icon--right">
                              <arrow-down />
                            </el-icon>
                          </span>
                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item
                                v-for="status in taskStatuses.filter((s) => s.value !== 'delete')"
                                :key="status.value"
                                :command="status.value"
                                :class="{ 'is-active': task.status === status.value }"
                              >
                                {{ status.label }}
                              </el-dropdown-item>
                              <el-dropdown-item :command="'delete'" class="delete-item">
                                {{ taskStatuses.find((s) => s.value === 'delete')?.label }}
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>
                  </template>
                </draggable>
                <div
                  v-if="getProjectTasks(project.id).length > 3 && !isProjectExpanded(project.id)"
                  class="more-tasks"
                  @click="toggleProjectExpansion(project.id)"
                >
                  还有 {{ getProjectTasks(project.id).length - 3 }} 个任务...（点击展开）
                </div>
                <div
                  v-if="isProjectExpanded(project.id)"
                  class="collapse-tasks"
                  @click="toggleProjectExpansion(project.id)"
                >
                  收起任务列表
                </div>
              </div>

              <!-- AI Status Details -->
              <div class="ai-status" v-if="project.aiStatus && project.aiStatus !== 'idle'">
                <div class="ai-command" v-if="project.aiCommand">
                  <small>当前命令: {{ project.aiCommand }}</small>
                </div>
                <div class="ai-duration" v-if="project.aiDuration">
                  <small>耗时: {{ formatDuration(project.aiDuration) }}</small>
                </div>
                <el-progress
                  v-if="project.aiStatus === 'running'"
                  :percentage="50"
                  :indeterminate="true"
                  :stroke-width="4"
                  color="#409eff"
                />
              </div>
            </el-card>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Project Dialog -->
    <el-dialog
      v-model="showCreateProject"
      title="新建项目"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="projectFormRef" :model="projectForm" :rules="projectRules" label-width="80px">
        <el-form-item label="项目名" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>

        <el-form-item label="Cursor密钥" prop="cursorKey">
          <el-input
            v-model="projectForm.cursorKey"
            placeholder="可选：Cursor AI密钥"
            type="password"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            placeholder="项目描述（可选）"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateProject = false">取消</el-button>
        <el-button type="primary" :loading="projectsStore.loading" @click="handleCreateProject">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- Edit Project Dialog -->
    <el-dialog
      v-model="showEditProject"
      title="编辑项目"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editProjectFormRef"
        :model="editProjectForm"
        :rules="projectRules"
        label-width="80px"
      >
        <el-form-item label="项目名" prop="name">
          <el-input v-model="editProjectForm.name" placeholder="请输入项目名称" />
        </el-form-item>

        <el-form-item label="Cursor密钥">
          <el-input
            v-model="editProjectForm.cursorKey"
            placeholder="可选：Cursor AI密钥"
            type="password"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="editProjectForm.description"
            type="textarea"
            placeholder="项目描述（可选）"
            :rows="3"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="editProjectForm.status">
            <el-radio label="active">活跃</el-radio>
            <el-radio label="hidden">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditProject = false">取消</el-button>
        <el-button type="primary" :loading="projectsStore.loading" @click="handleEditProject">
          更新
        </el-button>
      </template>
    </el-dialog>

    <!-- Floating Toggle Button -->
    <div class="floating-toggle">
      <el-button
        type="primary"
        circle
        :icon="showHeader ? 'Hide' : 'View'"
        @click="showHeader = !showHeader"
        size="large"
      >
        <template #icon>
          <el-icon>
            <ArrowUp v-if="showHeader" />
            <ArrowDown v-else />
          </el-icon>
        </template>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Plus,
  ArrowDown,
  ArrowUp,
  Rank,
  Loading,
  Check,
  Close,
  Warning,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import type { Task } from '@/services/tasks'
import type { Project } from '@/services/projects'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

// Reactive data
const showCreateProject = ref(false)
const showEditProject = ref(false)
const quickTaskInputs = ref<Record<string, string>>({})
const expandedProjects = ref<Set<string>>(new Set()) // 存储展开的项目ID
const showHeader = ref(true) // 控制头部显示状态

// Task statuses
const taskStatuses = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delete', label: '删除任务', danger: true },
]

// Project actions
const projectActions = [
  { value: 'edit', label: '编辑项目' },
  { value: 'toggle', label: '切换状态' },
  { value: 'delete', label: '删除项目', danger: true },
]

// Project form
const projectFormRef = ref()
const projectForm = reactive({
  name: '',
  cursorKey: '',
  description: '',
})

// Edit project form
const editProjectFormRef = ref()
const editProjectForm = reactive({
  id: '',
  name: '',
  cursorKey: '',
  description: '',
  status: 'active' as 'active' | 'hidden',
})

const projectRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
}

// Computed
const activeProjects = computed(() => projectsStore.activeProjects)
const allProjects = computed(() => projectsStore.projects)
const activatedProjects = computed(() =>
  projectsStore.projects.filter((p) => p.aiStatus === 'active'),
)
const runningAIProjects = computed(() => projectsStore.runningAIProjects)
const totalTasks = computed(() => projectsStore.totalTasks)
const currentProject = computed(() => projectsStore.currentProject)

// 快速创建任务
const createQuickTask = async (project: Project) => {
  const taskTitle = quickTaskInputs.value[project.id]?.trim()
  if (!taskTitle) {
    ElMessage.warning('请输入任务内容')
    return
  }

  try {
    await tasksStore.createTask({
      title: taskTitle,
      projectId: project.id,
      priority: 3, // 默认中等优先级
    })

    ElMessage.success('任务创建成功')

    // 清空输入框
    quickTaskInputs.value[project.id] = ''

    // 刷新项目的任务数据以更新统计
    await tasksStore.fetchTasksByProject(project.id)
  } catch (error) {
    console.error('Failed to create quick task:', error)
    ElMessage.error('创建任务失败')
  }
}

// Methods
const getProjectTasks = (projectId: string) => {
  return tasksStore.tasks.filter((task) => task.projectId === projectId)
}

const getDisplayedTasks = (projectId: string) => {
  const tasks = getProjectTasks(projectId)
  return isProjectExpanded(projectId) ? tasks : tasks.slice(0, 3)
}

const isProjectExpanded = (projectId: string) => {
  return expandedProjects.value.has(projectId)
}

const toggleProjectExpansion = (projectId: string) => {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId)
  } else {
    expandedProjects.value.add(projectId)
  }
}

// Update task status or delete task
const updateTaskStatus = async (task: Task, command: string) => {
  try {
    if (command === 'delete') {
      // Delete task
      await tasksStore.deleteTask(task.id)
      ElMessage.success('任务已删除')

      // 重新获取项目任务数据以更新统计
      await tasksStore.fetchTasksByProject(task.projectId)
    } else {
      // Update task status
      await tasksStore.updateTask(task.id, {
        status: command as 'pending' | 'in_progress' | 'completed',
      })
      ElMessage.success('任务状态已更新')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to update task:', error)
      ElMessage.error(command === 'delete' ? '删除任务失败' : '更新任务状态失败')
    }
  }
}

// Get status text for display
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

const getTaskStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'task-completed'
    case 'in_progress':
      return 'task-active'
    default:
      return 'task-pending'
  }
}

const getAIStatusType = (status?: string) => {
  switch (status) {
    case 'running':
      return 'primary'
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const getAIStatusText = (status?: string) => {
  return 'AI'
}

const getProjectStatusType = (project: Project) => {
  return project.status === 'active' ? 'success' : 'info'
}

const getProjectStatusText = (project: Project) => {
  return project.status === 'active' ? '激活' : '空闲'
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Project management methods
const editProject = (project: Project) => {
  // 设置编辑表单数据
  editProjectForm.id = project.id
  editProjectForm.name = project.name
  editProjectForm.cursorKey = project.cursorKey || ''
  editProjectForm.description = project.description || ''
  editProjectForm.status = project.status
  showEditProject.value = true
}

const deleteProject = async (project: Project) => {
  try {
    await projectsStore.deleteProject(project.id)
    ElMessage.success('项目已删除')

    // 如果删除的是当前项目，清空任务列表
    if (currentProject.value?.id === project.id) {
      tasksStore.clearTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete project:', error)
      ElMessage.error('删除项目失败')
    }
  }
}

const handleProjectAction = async (project: Project, action: string) => {
  switch (action) {
    case 'edit':
      editProject(project)
      break
    case 'toggle':
      await toggleProjectStatus(project)
      break
    case 'delete':
      await deleteProject(project)
      break
  }
}

const toggleProjectStatus = async (project: Project) => {
  try {
    const newStatus = project.status === 'active' ? 'hidden' : 'active'
    await projectsStore.updateProject(project.id, { status: newStatus })
    ElMessage.success(`项目已${newStatus === 'active' ? '显示' : '隐藏'}`)
  } catch (error) {
    console.error('Failed to toggle project status:', error)
    ElMessage.error('操作失败')
  }
}

const toggleAIStatus = async (project: Project) => {
  try {
    const newAIStatus = project.aiStatus === 'active' ? 'idle' : 'active'
    await projectsStore.updateAIStatus(project.id, { status: newAIStatus })
    ElMessage.success(`项目已${newAIStatus === 'active' ? '激活' : '设为空闲'}`)
  } catch (error) {
    console.error('Failed to toggle AI status:', error)
    ElMessage.error('操作失败')
  }
}

const toggleProjectActivation = async (project: Project) => {
  try {
    // 项目激活状态切换：使用 aiStatus 字段来表示激活状态 ('active'/'idle')
    // 注意：这里我们不改变项目的 status 字段，以免影响项目显示
    const targetAIStatus = project.aiStatus === 'active' ? 'idle' : 'active'
    console.log(`Switching project activation from ${project.aiStatus} to ${targetAIStatus}`)

    // 先更新本地状态，确保UI立即响应
    project.aiStatus = targetAIStatus

    // 使用 updateAIStatus API 更新项目激活状态
    const updatedProject = await projectsStore.updateAIStatus(project.id, {
      status: targetAIStatus,
    })
    console.log('Updated project:', updatedProject)

    // 如果API调用失败，回滚本地状态
    if (!updatedProject) {
      project.aiStatus = project.aiStatus === 'active' ? 'idle' : 'active'
    }

    ElMessage.success(`项目已${targetAIStatus === 'active' ? '激活' : '设为空闲'}`)
  } catch (error) {
    console.error('Failed to toggle project activation:', error)
    // 如果API调用失败，回滚本地状态
    project.aiStatus = project.aiStatus === 'active' ? 'idle' : 'active'
    ElMessage.error('操作失败')
  }
}

const toggleAIExecution = async (project: Project) => {
  try {
    // AI执行状态切换：基于项目的 aiStatus 字段 ('running'/'idle')
    const targetStatus = project.aiStatus === 'running' ? 'idle' : 'running'
    console.log(`Switching AI status from ${project.aiStatus} to ${targetStatus}`)

    // 先更新本地状态，确保UI立即响应
    project.aiStatus = targetStatus

    // 使用 updateAIStatus API 更新AI状态
    const updatedProject = await projectsStore.updateAIStatus(project.id, { status: targetStatus })
    console.log('Updated project:', updatedProject)

    // 如果API调用失败，回滚本地状态
    if (!updatedProject) {
      project.aiStatus = project.aiStatus === 'running' ? 'idle' : 'running'
    }

    ElMessage.success(`AI已${targetStatus === 'running' ? '开始执行' : '停止执行'}`)
  } catch (error) {
    console.error('Failed to toggle AI execution:', error)
    // 如果API调用失败，回滚本地状态
    project.aiStatus = project.aiStatus === 'running' ? 'idle' : 'running'
    ElMessage.error('操作失败')
  }
}

const handleEditProject = async () => {
  try {
    await editProjectFormRef.value?.validate()
    const { id, ...updateData } = editProjectForm
    await projectsStore.updateProject(id, updateData)
    ElMessage.success('项目更新成功')
    showEditProject.value = false
  } catch (error) {
    console.error('Failed to update project:', error)
  }
}

const handleCreateProject = async () => {
  try {
    await projectFormRef.value?.validate()

    // 确保创建的项目状态为active
    const projectData = {
      ...projectForm,
      status: 'active' as const,
    }

    await projectsStore.createProject(projectData)

    ElMessage.success('项目创建成功')
    showCreateProject.value = false

    // Reset form
    projectForm.name = ''
    projectForm.cursorKey = ''
    projectForm.description = ''
  } catch (error) {
    console.error('Failed to create project:', error)
  }
}

const copyTaskTitle = async (title: string) => {
  try {
    await navigator.clipboard.writeText(title)
    ElMessage.success('任务内容已复制到剪贴板')
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = title
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('任务内容已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    }
    document.body.removeChild(textArea)
  }
}

// VueDraggable functionality
const onTaskOrderChange = async (event: any, projectId: string) => {
  if (!event.moved) return

  try {
    // Get all tasks for this project that are not completed
    const allTasks = getProjectTasks(projectId).filter((task) => task.status !== 'completed')

    // Update order for all tasks based on new positions
    const updatePromises = allTasks.map((task, index) =>
      tasksStore.updateTaskOrder(task.id, index + 1),
    )

    await Promise.all(updatePromises)

    // Refresh tasks for this project
    await tasksStore.fetchTasksByProject(projectId)

    ElMessage.success('任务排序已更新')
  } catch {
    ElMessage.error('排序更新失败')
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// Lifecycle
onMounted(async () => {
  try {
    await projectsStore.fetchProjects()
    projectsStore.setupWebSocketListeners()

    // 为所有项目获取任务数据，以便在卡片中显示
    const projects = projectsStore.projects
    for (const project of projects) {
      try {
        await tasksStore.fetchTasksByProject(project.id)
      } catch (error) {
        console.error(`Failed to fetch tasks for project ${project.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load projects:', error)
  }
})

// Watch for current project changes
watch(currentProject, async (newProject) => {
  if (newProject) {
    try {
      await tasksStore.fetchTasksByProject(newProject.id)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.floating-toggle {
  position: fixed;
  bottom: 80px; /* 底部导航上方 */
  right: 20px;
  z-index: 1000;
}

.floating-toggle .el-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
}

.floating-toggle .el-button:hover {
  transform: scale(1.1);
  transition: transform 0.2s;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.main-content {
  margin: 0 auto;
  padding: 2rem;
}

.content-wrapper {
  display: grid;
  gap: 2rem;
}

.projects-section {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  padding: 0 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #303133;
}

.stats {
  display: flex;
  gap: 0.5rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
}

.project-card {
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.current-project {
  border: 2px solid #409eff;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.project-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.project-title-section h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #909399;
  white-space: nowrap;
}

.project-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start; /* Align to top like other elements */
  padding-top: 2px; /* Small adjustment to visually center */
}

.quick-task-input {
  margin: 0.75rem 0;
}

.quick-task-input :deep(.el-input) {
  border-radius: 6px;
}

.quick-task-input :deep(.el-input__inner) {
  border-radius: 6px;
  font-size: 0.875rem;
  resize: none; /* Disable manual resize */
}

.quick-task-input :deep(.el-input__inner:focus) {
  border-color: #409eff;
}

.quick-task-input :deep(.el-input__suffix) {
  cursor: pointer;
  color: #409eff;
  transition: color 0.2s;
}

.quick-task-input :deep(.el-input__suffix:hover) {
  color: #66b1ff;
}

.task-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cursor-key {
  font-family: monospace;
}

.project-desc {
  color: #606266;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.ai-status {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.project-tasks {
  margin: 1rem 0;
}

.tasks-divider {
  border-top: 1px dashed #e4e7ed;
  margin-bottom: 0.5rem;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
  cursor: grab;
  color: #909399;
  transition: color 0.2s;
}

.drag-handle:hover {
  color: #409eff;
}

/* VueDraggable styles */
.sortable-ghost {
  opacity: 0.4;
  background-color: rgba(64, 158, 255, 0.1) !important;
}

.sortable-chosen {
  opacity: 1;
}

.sortable-drag {
  transform: rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.task-item:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.task-item.task-pending {
  background-color: #fafafa;
  color: #909399;
}

.task-item.task-active {
  background-color: #f0f9ff;
  color: #1890ff;
}

.task-item.task-completed {
  background-color: #f6ffed;
  color: #52c41a;
}

.task-title {
  flex: 1;
  word-break: break-word;
  white-space: normal;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1.5;
}

.task-title:hover {
  color: #409eff;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-loading .el-icon.is-loading {
  animation: ai-loading-spin 1s linear infinite;
}

@keyframes ai-loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.task-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #666;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.task-status:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.task-status-dropdown :deep(.el-dropdown-menu__item.is-active) {
  color: #409eff;
  font-weight: 600;
}

.task-status-dropdown :deep(.el-dropdown-menu__item.delete-item) {
  color: #f56c6c;
}

.task-status-dropdown :deep(.el-dropdown-menu__item.delete-item:hover) {
  background-color: #fef0f0;
  color: #f56c6c;
}

.project-actions-dropdown :deep(.el-dropdown-menu__item.delete-item) {
  color: #f56c6c;
}

.project-actions-dropdown :deep(.el-dropdown-menu__item.delete-item:hover) {
  background-color: #fef0f0;
  color: #f56c6c;
}

/* Ensure dropdown button is vertically centered */
.project-actions-dropdown :deep(.el-button) {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1;
  height: auto;
}

.task-priority {
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 600;
}

.more-tasks {
  text-align: center;
  color: #409eff;
  font-size: 0.75rem;
  padding: 0.25rem;
  margin-top: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.more-tasks:hover {
  background-color: #ecf5ff;
}

.collapse-tasks {
  text-align: center;
  color: #909399;
  font-size: 0.75rem;
  padding: 0.25rem;
  margin-top: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.collapse-tasks:hover {
  background-color: #f5f7fa;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.task-stats {
  display: flex;
  gap: 0.5rem;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ai-command,
.ai-duration {
  margin-bottom: 0.25rem;
}

.tasks-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.task-column {
  display: flex;
  flex-direction: column;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #303133;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e4e7ed;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.task-card {
  transition: all 0.2s;
}

.task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-active {
  border-left: 4px solid #409eff;
}

.task-completed {
  opacity: 0.7;
}

.task-content {
  margin-bottom: 0.75rem;
}

.task-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  color: #303133;
}

.task-meta {
  display: flex;
  gap: 0.5rem;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Override Element Plus card body padding */
:deep(.el-card__body) {
  padding: 15px;
}

@media (max-width: 1024px) {
  .projects-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .tasks-container {
    grid-template-columns: 1fr;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
