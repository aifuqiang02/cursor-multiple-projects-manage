<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import {
  tasks,
  fetchTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  pendingTasks,
  inProgressTasks,
} from '@/services/tasks'
import { fetchProjects, projects } from '@/services/projects'
import type { Task } from '@/services/tasks'

// 路由和导航
const route = useRoute()
const router = useRouter()

// Props
const projectId = route.params.id as string

// 响应式数据
const showAddTask = ref(false)
const newTaskTitle = ref('')
const currentProject = ref(null)
const activeTab = ref('active') // 'active' 或 'completed'

// 计算属性
const projectTasks = computed(() => tasks.value.filter(task => task.projectId === projectId))
const activeTasks = computed(() => projectTasks.value.filter(task =>
  task.status === 'pending' || task.status === 'in_progress'
))
const completedTasks = computed(() => projectTasks.value.filter(task => task.status === 'completed'))

const sortedActiveTasks = computed(() => {
  return [...activeTasks.value].sort((a, b) => {
    // 首先按状态排序：进行中 > 待处理
    if (a.status !== b.status) {
      return a.status === 'in_progress' ? -1 : 1
    }
    // 然后按优先级排序
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    // 最后按创建时间排序
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
})

// 获取项目信息
const getProjectInfo = () => {
  return projects.value.find(p => p.id === projectId)
}

// 获取任务状态文本
const getTaskStatusText = (status: string) => {
  const statusMap = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

// 获取任务状态颜色
const getTaskStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#909399'
    case 'in_progress':
      return '#1989fa'
    case 'completed':
      return '#07c160'
    default:
      return '#909399'
  }
}

// 创建新任务
const handleCreateTask = async () => {
  const title = newTaskTitle.value.trim()
  if (!title) {
    showToast('请输入任务内容')
    return
  }

  try {
    showLoadingToast({
      message: '创建中...',
      forbidClick: true,
    })

    await createTask({
      title,
      projectId,
      priority: 3, // 默认中等优先级
    })

    closeToast()
    showToast('任务创建成功')
    newTaskTitle.value = ''
    showAddTask.value = false
  } catch (error) {
    closeToast()
    showToast('创建任务失败')
  }
}

// 更新任务状态
const handleUpdateTaskStatus = async (task: Task, newStatus: 'pending' | 'in_progress' | 'completed') => {
  try {
    await updateTask(task.id, { status: newStatus })

    const actionText = newStatus === 'in_progress' ? '开始处理' :
                      newStatus === 'completed' ? '完成' : '标记为待处理'
    showToast(`${actionText}成功`)
  } catch (error) {
    showToast('更新任务状态失败')
  }
}

// 删除任务
const handleDeleteTask = async (task: Task) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除任务"${task.title}"吗？`,
    })

    await deleteTask(task.id)
    showToast('任务已删除')
  } catch (error) {
    // 用户取消删除
  }
}

// 复制任务标题
const handleCopyTask = async (task: Task) => {
  try {
    await navigator.clipboard.writeText(task.title)
    showToast('任务内容已复制')
  } catch {
    showToast('复制失败')
  }
}

// 生命周期
onMounted(async () => {
  try {
    showLoadingToast({
      message: '加载中...',
      forbidClick: true,
    })

    // 获取项目信息
    await fetchProjects()
    currentProject.value = getProjectInfo()

    // 获取任务列表
    await fetchTasksByProject(projectId)

    closeToast()
  } catch (error) {
    closeToast()
    showToast('加载失败')
  }
})

// 监听路由变化
watch(() => route.params.id, async (newId) => {
  if (newId && newId !== projectId) {
    try {
      await fetchTasksByProject(newId as string)
      currentProject.value = getProjectInfo()
    } catch (error) {
      showToast('加载任务失败')
    }
  }
})
</script>

<template>
  <div class="project-tasks-container">
    <!-- 导航栏 -->
    <van-nav-bar
      :title="currentProject?.name || '项目任务'"
      left-text="返回"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 项目信息卡片 -->
    <div v-if="currentProject" class="project-info">
      <van-card>
        <template #header>
          <div class="project-header">
            <div class="project-title">{{ currentProject.name }}</div>
            <van-tag
              :type="currentProject.status === 'active' ? 'success' : 'default'"
              size="small"
            >
              {{ currentProject.status === 'active' ? '激活' : '隐藏' }}
            </van-tag>
          </div>
        </template>

        <div v-if="currentProject.description" class="project-desc">
          {{ currentProject.description }}
        </div>

        <div class="project-stats">
          <van-grid :column-num="3" :border="false">
            <van-grid-item>
              <van-cell
                :title="activeTasks.length"
                label="进行中"
                center
              />
            </van-grid-item>
            <van-grid-item>
              <van-cell
                :title="completedTasks.length"
                label="已完成"
                center
              />
            </van-grid-item>
            <van-grid-item>
              <van-cell
                :title="projectTasks.length"
                label="总任务"
                center
              />
            </van-grid-item>
          </van-grid>
        </div>
      </van-card>
    </div>

    <!-- 标签页 -->
    <van-tabs v-model="activeTab" sticky>
      <van-tab title="进行中" name="active">
        <!-- 新增任务按钮 -->
        <div class="add-task-section">
          <van-button
            v-if="!showAddTask"
            type="primary"
            block
            @click="showAddTask = true"
          >
            <van-icon name="plus" />
            新增任务
          </van-button>

          <!-- 新增任务输入框 -->
          <van-cell-group v-else>
            <van-field
              v-model="newTaskTitle"
              placeholder="输入任务内容"
              :border="false"
              :clearable="true"
              @keyup.enter="handleCreateTask"
            >
              <template #button>
                <van-button size="small" type="primary" @click="handleCreateTask">
                  添加
                </van-button>
                <van-button
                  size="small"
                  type="default"
                  @click="showAddTask = false; newTaskTitle = ''"
                >
                  取消
                </van-button>
              </template>
            </van-field>
          </van-cell-group>
        </div>

        <!-- 任务列表 -->
        <van-cell-group v-if="sortedActiveTasks.length > 0">
          <van-cell
            v-for="task in sortedActiveTasks"
            :key="task.id"
            :title="task.title"
            :label="`优先级: ${task.priority} | ${getTaskStatusText(task.status)}`"
            :value="task.status === 'pending' ? '开始处理' : '完成'"
            clickable
            @click="handleUpdateTaskStatus(task, task.status === 'pending' ? 'in_progress' : 'completed')"
          >
            <template #icon>
              <van-icon
                :name="task.status === 'in_progress' ? 'pause-circle-o' : 'play-circle-o'"
                :color="getTaskStatusColor(task.status)"
              />
            </template>
            <template #right-icon>
              <van-dropdown-menu>
                <van-dropdown-item
                  v-for="action in [
                    { text: '复制内容', value: 'copy' },
                    { text: '删除任务', value: 'delete' }
                  ]"
                  :key="action.value"
                  @click="action.value === 'copy' ? handleCopyTask(task) : handleDeleteTask(task)"
                />
              </van-dropdown-menu>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty
          v-else
          description="暂无进行中的任务"
          image="search"
        />
      </van-tab>

      <van-tab title="已完成" name="completed">
        <van-cell-group v-if="completedTasks.length > 0">
          <van-cell
            v-for="task in completedTasks"
            :key="task.id"
            :title="task.title"
            :label="`优先级: ${task.priority} | ${getTaskStatusText(task.status)}`"
            clickable
            @click="handleUpdateTaskStatus(task, 'pending')"
          >
            <template #icon>
              <van-icon name="success" color="#07c160" />
            </template>
            <template #right-icon>
              <van-dropdown-menu>
                <van-dropdown-item
                  v-for="action in [
                    { text: '复制内容', value: 'copy' },
                    { text: '删除任务', value: 'delete' },
                    { text: '重新开始', value: 'restart' }
                  ]"
                  :key="action.value"
                  @click="
                    action.value === 'copy' ? handleCopyTask(task) :
                    action.value === 'delete' ? handleDeleteTask(task) :
                    handleUpdateTaskStatus(task, 'pending')
                  "
                />
              </van-dropdown-menu>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty
          v-else
          description="暂无已完成的任务"
          image="search"
        />
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.project-tasks-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.project-info {
  padding: 16px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.project-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  flex: 1;
}

.project-desc {
  color: #646566;
  font-size: 14px;
  line-height: 1.5;
  margin: 8px 0;
}

.project-stats {
  margin-top: 16px;
}

.add-task-section {
  padding: 16px;
  background-color: #fff;
  margin-bottom: 16px;
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.van-cell__title) {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

:deep(.van-cell__label) {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}

:deep(.van-tabs) {
  background-color: #fff;
}

:deep(.van-tab) {
  flex: 1;
  text-align: center;
}

/* 自定义下拉菜单样式 */
:deep(.van-dropdown-menu) {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

:deep(.van-dropdown-menu__item) {
  padding: 8px 12px;
  font-size: 14px;
}

/* 空状态样式 */
:deep(.van-empty) {
  padding: 40px 20px;
}
</style>
