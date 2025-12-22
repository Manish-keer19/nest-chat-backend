import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule,PrismaModule],  // ← Import AuthModule to use JwtAuthGuard
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule { }
