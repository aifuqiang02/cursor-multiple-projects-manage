<template>
  <div class="home-container">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">Cursor项目管理器</h1>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateProject = true">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
          <el-button @click="handleLogout" type="text">
            退出登录
          </el-button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Projects List -->
        <div class="projects-section">
          <div class="section-header">
            <h2>项目列表</h2>
            <div class="stats">
              <el-tag type="info">{{ activeProjects.length }} 个活跃项目</el-tag>
              <el-tag type="warning">{{ runningAIProjects.length }} 个AI运行中</el-tag>
              <el-tag type="success">{{ totalTasks }} 个任务</el-tag>
            </div>
          </div>

          <div class="projects-grid">
            <el-card
              v-for="project in activeProjects"
              :key="project.id"
              class="project-card"
              :class="{ 'current-project': currentProject?.id === project.id }"
              @click="selectProject(project)"
            >
              <div class="project-header">
                <h3>{{ project.name }}</h3>
                <el-tag
                  :type="getAIStatusType(project.aiStatus)"
                  size="small"
                >
                  {{ getAIStatusText(project.aiStatus) }}
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

              <p class="project-desc" v-if="project.description">
                {{ project.description }}
              </p>

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

        <!-- Tasks Section -->
        <div class="tasks-section" v-if="currentProject">
          <div class="section-header">
            <h2>{{ currentProject.name }} - 任务列表</h2>
            <el-button type="primary" size="small" @click="showCreateTask = true">
              <el-icon><Plus /></el-icon>
              新建任务
            </el-button>
          </div>

          <div class="tasks-container">
            <div class="task-column">
              <h3 class="column-title">
                <el-icon><Clock /></el-icon>
                待处理 ({{ pendingTasks.length }})
              </h3>
              <div class="task-list">
                <el-card
                  v-for="task in pendingTasks"
                  :key="task.id"
                  class="task-card"
                  shadow="hover"
                >
                  <div class="task-content">
                    <h4>{{ task.title }}</h4>
                    <div class="task-meta">
                      <el-tag size="small" :type="getPriorityType(task.priority)">
                        优先级 {{ task.priority }}
                      </el-tag>
                    </div>
                  </div>
                  <div class="task-actions">
                    <el-button size="small" @click="startTask(task)">开始</el-button>
                    <el-button size="small" type="danger" @click="deleteTask(task)">删除</el-button>
                  </div>
                </el-card>
              </div>
            </div>

            <div class="task-column">
              <h3 class="column-title">
                <el-icon><Loading /></el-icon>
                进行中 ({{ inProgressTasks.length }})
              </h3>
              <div class="task-list">
                <el-card
                  v-for="task in inProgressTasks"
                  :key="task.id"
                  class="task-card task-active"
                  shadow="hover"
                >
                  <div class="task-content">
                    <h4>{{ task.title }}</h4>
                    <div class="task-meta">
                      <el-tag size="small" :type="getPriorityType(task.priority)">
                        优先级 {{ task.priority }}
                      </el-tag>
                    </div>
                  </div>
                  <div class="task-actions">
                    <el-button size="small" type="success" @click="completeTask(task)">完成</el-button>
                    <el-button size="small" @click="pauseTask(task)">暂停</el-button>
                  </div>
                </el-card>
              </div>
            </div>

            <div class="task-column">
              <h3 class="column-title">
                <el-icon><Check /></el-icon>
                已完成 ({{ completedTasks.length }})
              </h3>
              <div class="task-list">
                <el-card
                  v-for="task in completedTasks"
                  :key="task.id"
                  class="task-card task-completed"
                  shadow="hover"
                >
                  <div class="task-content">
                    <h4>{{ task.title }}</h4>
                    <div class="task-meta">
                      <el-tag size="small" type="success">
                        已完成
                      </el-tag>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>
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
      <el-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectRules"
        label-width="80px"
      >
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
        <el-button
          type="primary"
          :loading="projectsStore.loading"
          @click="handleCreateProject"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- Create Task Dialog -->
    <el-dialog
      v-model="showCreateTask"
      title="新建任务"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="80px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="taskForm.priority" placeholder="选择优先级">
            <el-option label="最高优先级" :value="1" />
            <el-option label="较高优先级" :value="2" />
            <el-option label="普通优先级" :value="3" />
            <el-option label="较低优先级" :value="4" />
            <el-option label="最低优先级" :value="5" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateTask = false">取消</el-button>
        <el-button
          type="primary"
          :loading="tasksStore.loading"
          @click="handleCreateTask"
        >
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Document,
  Clock,
  Loading,
  Check
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import type { Project } from '@/services/projects'
import type { Task } from '@/services/tasks'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

// Reactive data
const showCreateProject = ref(false)
const showCreateTask = ref(false)

// Project form
const projectFormRef = ref()
const projectForm = reactive({
  name: '',
  cursorKey: '',
  description: ''
})

const projectRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' }
  ]
}

// Task form
const taskFormRef = ref()
const taskForm = reactive({
  title: '',
  priority: 3
})

const taskRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' }
  ]
}

// Computed
const activeProjects = computed(() => projectsStore.activeProjects)
const runningAIProjects = computed(() => projectsStore.runningAIProjects)
const totalTasks = computed(() => projectsStore.totalTasks)
const currentProject = computed(() => projectsStore.currentProject)

const pendingTasks = computed(() => tasksStore.pendingTasks())
const inProgressTasks = computed(() => tasksStore.inProgressTasks())
const completedTasks = computed(() => tasksStore.completedTasks())

// Methods
const getAIStatusType = (status?: string) => {
  switch (status) {
    case 'running': return 'primary'
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'warning': return 'warning'
    default: return ''
  }
}

const getAIStatusText = (status?: string) => {
  switch (status) {
    case 'running': return '运行中'
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'warning': return '警告'
    default: return '空闲'
  }
}

const getPriorityType = (priority: number) => {
  if (priority <= 2) return 'danger'
  if (priority <= 3) return 'warning'
  return 'info'
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const selectProject = async (project: Project) => {
  try {
    await projectsStore.fetchProjectDetails(project.id)
    await tasksStore.fetchTasksByProject(project.id)
  } catch (error) {
    console.error('Failed to select project:', error)
  }
}

const handleCreateProject = async () => {
  try {
    await projectFormRef.value?.validate()
    await projectsStore.createProject(projectForm)
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

const handleCreateTask = async () => {
  if (!currentProject.value) return

  try {
    await taskFormRef.value?.validate()
    await tasksStore.createTask({
      ...taskForm,
      projectId: currentProject.value.id
    })
    ElMessage.success('任务创建成功')
    showCreateTask.value = false

    // Reset form
    taskForm.title = ''
    taskForm.priority = 3
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}

const startTask = async (task: Task) => {
  try {
    await tasksStore.updateTask(task.id, { status: 'in_progress' })
    ElMessage.success('任务已开始')
  } catch (error) {
    console.error('Failed to start task:', error)
  }
}

const completeTask = async (task: Task) => {
  try {
    await tasksStore.updateTask(task.id, { status: 'completed' })
    ElMessage.success('任务已完成')
  } catch (error) {
    console.error('Failed to complete task:', error)
  }
}

const pauseTask = async (task: Task) => {
  try {
    await tasksStore.updateTask(task.id, { status: 'pending' })
    ElMessage.success('任务已暂停')
  } catch (error) {
    console.error('Failed to pause task:', error)
  }
}

const deleteTask = async (task: Task) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个任务吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await tasksStore.deleteTask(task.id)
    ElMessage.success('任务已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete task:', error)
    }
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.content-wrapper {
  display: grid;
  gap: 2rem;
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
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
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
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.project-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #303133;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #909399;
  margin-bottom: 0.5rem;
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

.ai-command,
.ai-duration {
  margin-bottom: 0.25rem;
}

.tasks-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
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
