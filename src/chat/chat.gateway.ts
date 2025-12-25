

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private jwtService: JwtService
  ) { }

  async handleConnection(client: Socket) {
    try {
      // Authenticate user from token in query or auth header
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        // client.disconnect(); // Optional: Strict auth
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;
      client.data.username = payload.username; // Or fetch from DB if needed

      // Set status to online
      await this.usersService.setOnlineStatus(userId, true);

      // Broadcast online status
      this.server.emit('user-presence-update', {
        userId,
        isOnline: true,
        lastSeen: null
      });

      console.log(`User connected: ${userId}`);

    } catch (e) {
      console.error('Connection auth failed', e);
      // client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      // Set status to offline
      await this.usersService.setOnlineStatus(userId, false);

      // Broadcast offline status
      this.server.emit('user-presence-update', {
        userId,
        isOnline: false,
        lastSeen: new Date()
      });

      console.log(`User disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() username: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.data.username = username;
    client.emit('joined', `Welcome ${username}`);
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody()
    data: {
      conversationId: string;
      senderId: string;
      text: string;
      attachments?: any[];
      replyToId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, text, senderId, attachments, replyToId } = data;

    // Make sure user is actually in conversation
    const isAllowed = await this.chatService.isUserInConversation(
      conversationId,
      senderId,
    );

    if (!isAllowed) {
      return client.emit('error', 'You are not part of this conversation');
    }

    // Save to DB
    const message = await this.chatService.saveMessage(
      conversationId,
      senderId,
      text,
      attachments,
      replyToId,
    );

    // Broadcast to all clients in that conversation room
    this.server.to(conversationId).emit('message', message);
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log("client join", client.data);
    client.join(conversationId);
  }

  // ==================== MESSAGE READ/DELIVERY EVENTS ====================

  @SubscribeMessage('message-delivered')
  async handleMessageDelivered(
    @MessageBody() data: { messageId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, userId } = data;

    try {
      const result = await this.chatService.markMessageAsDelivered(messageId, userId);

      if (result) {
        // Get the message to find conversation
        const message = await this.chatService.getMessageStatus(messageId);

        // Notify sender that message was delivered
        this.server.to(message.senderId).emit('message-delivery-update', {
          messageId,
          userId,
          status: 'delivered',
          deliveredAt: result.deliveredAt,
        });
      }
    } catch (error) {
      client.emit('error', error.message);
    }
  }

  @SubscribeMessage('message-read')
  async handleMessageRead(
    @MessageBody() data: { messageId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, userId } = data;

    try {
      const result = await this.chatService.markMessageAsRead(messageId, userId);

      if (result) {
        // Get the message to find conversation
        const message = await this.chatService.getMessageStatus(messageId);

        // Notify sender that message was read
        this.server.to(message.senderId).emit('message-read-update', {
          messageId,
          userId,
          status: 'read',
          readAt: result.readAt,
        });
      }
    } catch (error) {
      client.emit('error', error.message);
    }
  }

  @SubscribeMessage('conversation-read')
  async handleConversationRead(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, userId } = data;

    try {
      await this.chatService.markConversationAsRead(conversationId, userId);

      // Notify all users in conversation
      this.server.to(conversationId).emit('conversation-read-update', {
        conversationId,
        userId,
        readAt: new Date(),
      });
    } catch (error) {
      client.emit('error', error.message);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; userId: string; username: string; avatarUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, userId, username, avatarUrl } = data;

    // Broadcast to others in conversation (not to self)
    client.to(conversationId).emit('user-typing', {
      userId,
      username,
      avatarUrl,
      conversationId,
    });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, userId } = data;

    client.to(conversationId).emit('user-stop-typing', {
      userId,
      conversationId,
    });
  }
}

