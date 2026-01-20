import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/migrations',
})
export class MigrationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MigrationsGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up subscriptions
    for (const [jobId, clients] of this.connectedClients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.connectedClients.delete(jobId);
      }
    }
  }

  @SubscribeMessage('subscribe:job')
  handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const { jobId } = data;

    if (!this.connectedClients.has(jobId)) {
      this.connectedClients.set(jobId, new Set());
    }
    this.connectedClients.get(jobId)!.add(client.id);

    client.join(`job:${jobId}`);
    this.logger.debug(`Client ${client.id} subscribed to job ${jobId}`);

    return { success: true, subscribed: jobId };
  }

  @SubscribeMessage('unsubscribe:job')
  handleUnsubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const { jobId } = data;

    this.connectedClients.get(jobId)?.delete(client.id);
    client.leave(`job:${jobId}`);

    return { success: true, unsubscribed: jobId };
  }

  /**
   * Emit migration progress update
   */
  emitProgress(jobId: string, data: {
    progress: number;
    processedItems: number;
    totalItems: number;
    currentTask?: string;
    transferredBytes?: number;
    totalBytes?: number;
  }) {
    this.server.to(`job:${jobId}`).emit('migration:progress', {
      jobId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit task update
   */
  emitTaskUpdate(jobId: string, taskId: string, data: {
    status: string;
    progress: number;
    processedItems?: number;
    totalItems?: number;
  }) {
    this.server.to(`job:${jobId}`).emit('migration:task:update', {
      jobId,
      taskId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit migration completed
   */
  emitCompleted(jobId: string, summary: {
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    duration: number;
  }) {
    this.server.to(`job:${jobId}`).emit('migration:completed', {
      jobId,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit migration error
   */
  emitError(jobId: string, error: {
    taskId?: string;
    message: string;
    code?: string;
    details?: object;
  }) {
    this.server.to(`job:${jobId}`).emit('migration:error', {
      jobId,
      ...error,
      timestamp: new Date().toISOString(),
    });
  }
}
