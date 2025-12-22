import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Post } from 'generated/prisma/browser';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createPostDto: CreatePostDto, user: JwtPayload): Promise<Post> {
    return await this.prisma.post.create({
      data: {
        content: createPostDto.content,
        authorId: user.sub,
        title: createPostDto.title,

        stats: {
          create: { likeCount: 0, commentCount: 0, viewCount: 0, }

        }

      }
    })
  }

  async findAll(user: JwtPayload) {
    return await this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    return await this.prisma.post.findUnique({
      where: {
        id,
        authorId: user.sub
      }
    })
  }

  async update(id: string, updatePostDto: UpdatePostDto, user: JwtPayload) {
    return await this.prisma.post.update({
      where: {
        id,
        authorId: user.sub
      },
      data: updatePostDto
    })
  }

  async remove(id: string, user: JwtPayload) {
    return await this.prisma.post.delete({
      where: {
        id,
        authorId: user.sub
      }
    })
  }
}
