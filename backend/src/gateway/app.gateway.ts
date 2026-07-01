import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || !token) {
      socket.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      socket.data.userId = payload.sub;
      await socket.join(`user:${payload.sub}`);
    } catch {
      socket.disconnect();
    }
  }

  @SubscribeMessage('board:join')
  async joinBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { boardId?: string },
  ): Promise<void> {
    const boardId = data?.boardId;
    const userId = socket.data.userId as string | undefined;

    if (!boardId || !userId) {
      socket.emit('error', { message: 'Invalid board join request.' });
      return;
    }

    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true },
    });

    if (!membership) {
      socket.emit('error', { message: 'You are not a member of this board.' });
      return;
    }

    await socket.join(`board:${boardId}`);
  }

  @SubscribeMessage('board:leave')
  async leaveBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { boardId?: string },
  ): Promise<void> {
    if (data?.boardId) {
      await socket.leave(`board:${data.boardId}`);
    }
  }

  emitToBoardExcept(
    boardId: string,
    event: string,
    payload: unknown,
    excludeSocketId?: string,
  ): void {
    const room = this.server.to(`board:${boardId}`);

    if (excludeSocketId) {
      room.except(excludeSocketId).emit(event, payload);
      return;
    }

    room.emit(event, payload);
  }

  emitToBoard(boardId: string, event: string, payload: unknown): void {
    this.server.to(`board:${boardId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
