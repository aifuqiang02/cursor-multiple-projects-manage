import { Server as SocketIOServer } from 'socket.io';
export declare function setWebSocketServer(server: SocketIOServer): void;
export declare function emitWebSocketEvent(event: string, data: any): void;
export declare function broadcastWebSocketEvent(event: string, data: any, excludeSocketId?: string): void;
//# sourceMappingURL=websocket.d.ts.map