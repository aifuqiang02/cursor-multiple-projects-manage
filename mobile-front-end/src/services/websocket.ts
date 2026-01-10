import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectWebSocket() {
  if (socket && socket.connected) {
    return socket;
  }

  // 连接到服务器的WebSocket
  socket = io('http://110.42.111.221:1966', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[WebSocket Mobile] Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket Mobile] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket Mobile] Connection error:', error);
  });

  // 监听用户待办任务相关事件
  socket.on('user-todo-created', (data) => {
    console.log('[WebSocket Mobile] User todo created:', data);
    // 触发自定义事件，让组件知道有新的待办任务
    window.dispatchEvent(new CustomEvent('user-todo-created', { detail: data }));
  });

  socket.on('user-todo-updated', (data) => {
    console.log('[WebSocket Mobile] User todo updated:', data);
    window.dispatchEvent(new CustomEvent('user-todo-updated', { detail: data }));
  });

  socket.on('user-todo-completed', (data) => {
    console.log('[WebSocket Mobile] User todo completed:', data);
    window.dispatchEvent(new CustomEvent('user-todo-completed', { detail: data }));
  });

  socket.on('user-todo-deleted', (data) => {
    console.log('[WebSocket Mobile] User todo deleted:', data);
    window.dispatchEvent(new CustomEvent('user-todo-deleted', { detail: data }));
  });

  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
