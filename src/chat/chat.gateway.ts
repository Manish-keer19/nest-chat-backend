

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

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
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, text, senderId } = data;
    // console.log("data in send message",data);

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
    );

    // Broadcast to all clients in that conversation room
    this.server.to(conversationId).emit('message', message);

  }



  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log("client join",client.data);
    client.join(conversationId);
  }
}
