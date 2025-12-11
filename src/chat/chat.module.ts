import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatsController } from './chat.controller';

@Module({
  imports: [PrismaModule],
  providers: [ChatService, ChatGateway],
  controllers: [ChatsController],
})
export class ChatModule {}
