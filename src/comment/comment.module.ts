import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [CommentService],
  controllers: [CommentController],
  imports :[PrismaModule]
})
export class CommentModule {}
