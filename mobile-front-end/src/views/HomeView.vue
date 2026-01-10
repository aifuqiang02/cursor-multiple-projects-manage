<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { showToast, showLoadingToast, closeToast } from "vant";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchProjects, projects, allProjects } from "@/services/projects";
import { tasks, fetchTasksByProject } from "@/services/tasks";

// 响应式数据
const activeTab = ref("projects");
const activeTabBar = ref(0);

const router = useRouter();
const authStore = useAuthStore();

// 计算每个项目的活跃任务数量
const getActiveTaskCount = (projectId: string) => {
  const projectTasks = tasks.value.filter((task) => task.projectId === projectId);
  return projectTasks.filter((task) => task.status === "pending" || task.status === "in_progress")
    .length;
};

// 按照活跃任务数量降序排序的项目列表
const sortedProjects = computed(() => {
  return [...allProjects.value].sort((a, b) => {
    const countA = getActiveTaskCount(a.id);
    const countB = getActiveTaskCount(b.id);
    return countB - countA; // 降序排列，任务多的在前
  });
});

// 方法

const handleLogout = () => {
  authStore.logout();
  showToast("已退出登录");
  router.push("/login");
};

// 点击项目跳转到任务列表
const handleProjectClick = (project: any) => {
  router.push(`/projects/${project.id}/tasks`);
};

// 底部导航切换
const onTabBarChange = (index: number) => {
  activeTabBar.value = index;

  // 根据不同的标签页显示不同内容或执行不同操作
  switch (index) {
    case 0: // 项目
      activeTab.value = "projects";
      // 不显示toast，避免干扰用户体验
      break;
    case 1: // 设置
      activeTab.value = "settings";
      showToast("进入设置页面");
      break;
  }
};

// 生命周期
onMounted(async () => {
  try {
    showLoadingToast({
      message: "加载项目中...",
      forbidClick: true,
    });

    await fetchProjects();

    // 为所有项目加载任务数据，以便显示活跃任务数量
    const projectsList = projects.value;
    for (const project of projectsList) {
      try {
        await fetchTasksByProject(project.id);
      } catch (error) {
        console.error(`Failed to fetch tasks for project ${project.id}:`, error);
      }
    }

    closeToast();
  } catch {
    closeToast();
    showToast("加载项目失败");
  }
});
</script>

<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <van-nav-bar title="移动端项目管理器" right-text="退出" @click-right="handleLogout" />


    <!-- 标签页内容 -->
    <div class="tab-content">
      <!-- 项目标签页 -->
      <div v-if="activeTab === 'projects'" class="tab-pane">
        <van-cell-group v-if="allProjects.length > 0">
          <van-cell
            v-for="project in sortedProjects"
            :key="project.id"
            :title="project.name"
            :label="project.description || '暂无描述'"
            clickable
            @click="handleProjectClick(project)"
          >
            <template #icon>
              <van-icon name="orders-o" />
            </template>
            <template #right-icon>
              <div class="task-count-wrapper">
                <van-badge :content="getActiveTaskCount(project.id)" />
                <van-icon name="arrow" style="margin-left: 8px;" />
              </div>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty v-else description="暂无项目" image="search">
          <van-button round type="primary" class="bottom-button">创建项目</van-button>
        </van-empty>
      </div>


      <!-- 设置标签页 -->
      <div v-else-if="activeTab === 'settings'" class="tab-pane">
        <div class="settings-content">
          <van-cell-group>
            <van-cell title="账号设置" is-link @click="showToast('账号设置')" />
            <van-cell title="通知设置" is-link @click="showToast('通知设置')" />
            <van-cell title="隐私设置" is-link @click="showToast('隐私设置')" />
            <van-cell title="关于我们" is-link @click="showToast('关于我们')" />
            <van-cell title="版本信息" label="v1.0.0" />
          </van-cell-group>
        </div>
      </div>

      <!-- 默认显示项目标签页 -->
      <div v-else class="tab-pane">
        <van-card
          v-for="project in projects"
          :key="project.id"
          :title="project.name"
          :desc="project.desc"
          :thumb="project.thumb"
        >
          <template #footer>
            <van-button size="mini" type="primary">查看详情</van-button>
          </template>
        </van-card>
      </div>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTabBar" @change="onTabBarChange">
      <van-tabbar-item icon="home-o">项目</van-tabbar-item>
      <van-tabbar-item icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.home-container {
  padding-bottom: 50px; /* 为底部导航留出空间 */
}

.tab-content {
  padding: 16px;
}

.tab-pane {
  min-height: 300px;
}

.bottom-button {
  margin-top: 16px;
}

.settings-content {
  text-align: center;
  padding: 40px 20px;
}

/* 自定义底部导航样式 */
:deep(.van-tabbar-item) {
  font-size: 12px;
}

/* 项目卡片样式 */
:deep(.van-card) {
  margin-bottom: 16px;
  border-radius: 8px;
}


/* 标签页样式 */
:deep(.van-tabs) {
  margin-bottom: 16px;
}

:deep(.van-tabs__nav) {
  background: #f7f8fa;
  border-radius: 8px 8px 0 0;
}

:deep(.van-tab) {
  flex: 1;
  text-align: center;
}

.task-count-wrapper {
  display: flex;
  align-items: center;
}

:deep(.van-badge) {
  margin-right: 8px;
}
</style>
