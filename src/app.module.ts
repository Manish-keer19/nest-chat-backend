import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { PostModule } from './post/post.module';
import { AdminModule } from './admin/admin.module';
import { CommentModule } from './comment/comment.module';
import { UploadModule } from './upload/upload.module';
import { CallModule } from './call/call.module';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    ChatModule,
    PostModule,
    AdminModule,
    CommentModule,
    UploadModule,
    CallModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

