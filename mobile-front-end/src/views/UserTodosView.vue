<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { showToast } from "vant";
import { useRouter } from "vue-router";
import api from "@/services/api";

// 类型定义
interface UserTodo {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: number;
  projectId?: string;
  aiCommand?: string;
  aiResult?: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  };
}

// 响应式数据
const activeTabBar = ref(1); // 待办任务是第2个标签
const userTodos = ref<UserTodo[]>([]);
const loading = ref(false);
const currentTimestamp = ref(Date.now()); // 当前时间戳

const router = useRouter();

// 时间更新定时器
let timeUpdateInterval: number | null = null;

// 计算属性
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}秒`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    const remainingSeconds = diffSeconds % 60;
    return remainingSeconds > 0 ? `${diffMinutes}分钟${remainingSeconds}秒` : `${diffMinutes}分钟`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (remainingMinutes > 0) {
    return `${diffHours}小时${remainingMinutes}分钟`;
  } else {
    return `${diffHours}小时`;
  }
};

// 计算每个todo的时间显示
const getTodoTimeLabel = (todo: UserTodo) => {
  // 读取currentTimestamp来触发响应式更新（ESLint忽略）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _trigger = currentTimestamp.value;
  const timeStr = getTimeAgo(todo.createdAt);
  return todo.description ? `${todo.description} • ${timeStr}` : timeStr;
};

// 方法
const completeTodo = async (todoId: string) => {
  try {
    await api.post(`/usertodos/${todoId}/complete`);
    showToast("任务已完成");
  } catch (error) {
    console.error("完成待办任务失败:", error);
    showToast("完成任务失败");
  }
};

const fetchUserTodos = async () => {
  try {
    loading.value = true;
    const response = await api.get("/usertodos?status=pending");
    userTodos.value = response.data.data;
  } catch (error) {
    console.error("获取待办任务失败:", error);
    showToast("获取待办任务失败");
  } finally {
    loading.value = false;
  }
};

// 底部导航切换
const onTabBarChange = (index: number) => {
  activeTabBar.value = index;

  switch (index) {
    case 0: // 项目
      router.push("/home");
      break;
    case 1: // 待办任务
      // 已经在当前页面
      break;
    case 2: // 设置
      // TODO: 跳转到设置页面或显示设置内容
      showToast("进入设置页面");
      break;
  }
};

// WebSocket事件处理
const handleUserTodoCreated = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log("收到新待办任务通知:", customEvent.detail);
  showToast("有新的待办任务");
  fetchUserTodos(); // 刷新待办任务列表
};

const handleUserTodoUpdated = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log("待办任务更新通知:", customEvent.detail);
  fetchUserTodos(); // 刷新待办任务列表
};

const handleUserTodoCompleted = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log("待办任务完成通知:", customEvent.detail);
  fetchUserTodos(); // 刷新待办任务列表
};

const handleUserTodoDeleted = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log("待办任务删除通知:", customEvent.detail);
  fetchUserTodos(); // 刷新待办任务列表
};

const handleAiExecutionStarted = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log("AI执行开始通知:", customEvent.detail);
  // 当AI开始执行时，刷新待办任务列表（因为旧任务已被删除）
  fetchUserTodos();
};

// 生命周期
onMounted(async () => {
  await fetchUserTodos();

  // 添加WebSocket事件监听
  window.addEventListener("user-todo-created", handleUserTodoCreated);
  window.addEventListener("user-todo-updated", handleUserTodoUpdated);
  window.addEventListener("user-todo-completed", handleUserTodoCompleted);
  window.addEventListener("user-todo-deleted", handleUserTodoDeleted);
  window.addEventListener("ai-execution-started", handleAiExecutionStarted);

  // 启动时间更新定时器，每秒更新一次
  timeUpdateInterval = setInterval(() => {
    currentTimestamp.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  // 移除WebSocket事件监听
  window.removeEventListener("user-todo-created", handleUserTodoCreated);
  window.removeEventListener("user-todo-updated", handleUserTodoUpdated);
  window.removeEventListener("user-todo-completed", handleUserTodoCompleted);
  window.removeEventListener("user-todo-deleted", handleUserTodoDeleted);
  window.removeEventListener("ai-execution-started", handleAiExecutionStarted);

  // 清除时间更新定时器
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
});
</script>

<template>
  <div class="todos-container">
    <!-- 导航栏 -->
    <van-nav-bar title="待办任务" />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 待办任务列表 -->
      <van-pull-refresh v-model="loading" @refresh="fetchUserTodos">
        <van-list v-if="userTodos.length > 0">
          <van-cell-group>
            <van-cell
              v-for="todo in userTodos"
              :key="todo.id"
              :title="todo.title"
              :label="getTodoTimeLabel(todo)"
              clickable
            >
              <template #icon>
                <van-icon name="todo-list-o" color="#2196f3" />
              </template>

              <template #right-icon>
                <!-- 完成按钮 -->
                <van-button type="primary" size="small" @click.stop="completeTodo(todo.id)">
                  完成
                </van-button>
              </template>
            </van-cell>
          </van-cell-group>
        </van-list>

        <!-- 空状态 -->
        <van-empty v-else description="暂无待办任务" image="todo-list-o">
          <van-button round type="primary" class="bottom-button"> 刷新 </van-button>
        </van-empty>
      </van-pull-refresh>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTabBar" @change="onTabBarChange">
      <van-tabbar-item icon="home-o">项目</van-tabbar-item>
      <van-tabbar-item icon="todo-list-o">待办</van-tabbar-item>
      <van-tabbar-item icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.todos-container {
  padding-bottom: 50px; /* 为底部导航留出空间 */
  min-height: 100vh;
  background-color: #f7f8fa;
}

.content {
  padding: 16px;
}

.bottom-button {
  margin-top: 16px;
}

:deep(.van-cell) {
  margin-bottom: 8px;
  border-radius: 8px;
}

:deep(.van-card) {
  border-radius: 8px;
}
</style>
