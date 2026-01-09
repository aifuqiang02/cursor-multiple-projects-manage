<script setup lang="ts">
import { ref, onMounted } from "vue";
import { showToast, showLoadingToast, closeToast } from "vant";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchProjects, projects, activeProjects } from "@/services/projects";

// 响应式数据
const searchValue = ref("");
const activeTab = ref("projects");
const activeTabBar = ref(0);

const router = useRouter();
const authStore = useAuthStore();

// 方法
const onSearch = (value: string) => {
  showToast(`搜索: ${value}`);
};

const onClickButton = () => {
  showToast("Hello Vant!");
};

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
    case 0: // 首页
      activeTab.value = "projects";
      // 不显示toast，避免干扰用户体验
      break;
    case 1: // 搜索
      activeTab.value = "search";
      // 显示搜索提示
      showToast("进入搜索页面");
      break;
    case 2: // 好友
      activeTab.value = "friends";
      showToast("进入好友页面");
      break;
    case 3: // 设置
      activeTab.value = "settings";
      showToast("进入设置页面");
      break;
  }
};

// 生命周期
onMounted(async () => {
  try {
    showLoadingToast({
      message: '加载项目中...',
      forbidClick: true,
    });

    await fetchProjects();
    closeToast();
  } catch (error) {
    closeToast();
    showToast('加载项目失败');
  }
});
</script>

<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <van-nav-bar title="移动端项目管理器" right-text="退出" @click-right="handleLogout" />

    <!-- 搜索框 -->
    <van-search v-model="searchValue" placeholder="请输入搜索关键词" show-action @search="onSearch">
      <template #action>
        <div @click="onClickButton">搜索</div>
      </template>
    </van-search>

    <!-- 标签页内容 -->
    <div class="tab-content">
      <!-- 项目标签页 -->
      <div v-if="activeTab === 'projects'" class="tab-pane">
        <van-cell-group v-if="activeProjects.length > 0">
          <van-cell
            v-for="project in activeProjects"
            :key="project.id"
            :title="project.name"
            :label="project.description || '暂无描述'"
            :value="`${project._count?.tasks || 0} 个任务`"
            clickable
            @click="handleProjectClick(project)"
          >
            <template #icon>
              <van-icon name="orders-o" />
            </template>
            <template #right-icon>
              <van-icon name="arrow" />
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty
          v-else
          description="暂无项目"
          image="search"
        >
          <van-button round type="primary" class="bottom-button">
            创建项目
          </van-button>
        </van-empty>
      </div>

      <!-- 任务标签页 -->
      <div v-else-if="activeTab === 'tasks'" class="tab-pane">
        <van-cell-group>
          <van-cell
            v-for="task in tasks"
            :key="task.id"
            :title="task.title"
            :label="task.desc"
            :value="task.status"
          />
        </van-cell-group>
      </div>

      <!-- 搜索标签页 -->
      <div v-else-if="activeTab === 'search'" class="tab-pane">
        <div class="search-content">
          <van-empty description="搜索项目和任务" image="search">
            <van-button round type="primary" class="bottom-button" @click="onClickButton">
              开始搜索
            </van-button>
          </van-empty>
        </div>
      </div>

      <!-- 好友标签页 -->
      <div v-else-if="activeTab === 'friends'" class="tab-pane">
        <div class="friends-content">
          <van-empty description="好友功能" image="friends-o">
            <van-button
              round
              type="primary"
              class="bottom-button"
              @click="showToast('好友功能开发中')"
            >
              添加好友
            </van-button>
          </van-empty>
        </div>
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
      <van-tabbar-item icon="search">搜索</van-tabbar-item>
      <van-tabbar-item icon="friends-o">好友</van-tabbar-item>
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

.search-content {
  text-align: center;
  padding: 40px 20px;
}

.bottom-button {
  margin-top: 16px;
}

.friends-content,
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

/* 搜索框样式 */
:deep(.van-search) {
  padding: 16px;
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
</style>
