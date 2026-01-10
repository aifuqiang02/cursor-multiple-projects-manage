<script setup lang="ts">
import { RouterView } from "vue-router";
import { onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { connectWebSocket, disconnectWebSocket } from "@/services/websocket";

const authStore = useAuthStore();

// 在应用启动时检查认证状态并连接WebSocket
onMounted(async () => {
  await authStore.checkAuth();

  // 连接WebSocket
  connectWebSocket();
});

// 在应用卸载时断开WebSocket连接
onUnmounted(() => {
  disconnectWebSocket();
});
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
