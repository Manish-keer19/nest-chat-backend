
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CreatePostDto } from "./dto/create-post.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { PostService } from "./post.service";
import type { JwtPayload } from "src/auth/interfaces/jwt-payload.interface";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { UpdatePostDto } from "./dto/update-post.dto";





@ApiTags('Posts')
@Controller("post")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PostController {
  constructor(private readonly postService: PostService) { }

  @Post()
  @ApiOperation({
    summary: 'Create a new post',
    description: 'Creates a new post with the authenticated user as the author. Requires JWT authentication.'
  })
  @ApiBody({
    type: CreatePostDto,
    description: 'Post data to create',
    examples: {
      example1: {
        summary: 'Sample Post',
        value: {
          title: 'My First Post',
          content: 'This is the content of my first post.'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    schema: {
      example: {
        id: 'uuid-123-456',
        title: 'My First Post',
        content: 'This is the content of my first post.',
        authorId: 'user-uuid-789',
        createdAt: '2025-12-13T12:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data'
  })
  createPost(@Body() createPostDto: CreatePostDto, @CurrentUser() user: JwtPayload) {
    console.log("user", user)
    return this.postService.create(createPostDto, user);
  }


  @Get()
  @ApiOperation({
    summary: 'Get all posts',
    description: 'Retrieve list of all posts. Requires JWT authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of posts',
    schema: {
      example: [
        {
          id: 'uuid-123-456',
          title: 'My First Post',
          content: 'This is the content of my first post.',
          authorId: 'user-uuid-789',
          createdAt: '2025-12-13T12:00:00.000Z',
          updatedAt: '2025-12-13T12:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Not Found - No posts found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  getAllPosts(@CurrentUser() user: JwtPayload) {
    return this.postService.findAll(user);
  }


  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific post',
    description: 'Retrieve a specific post by ID. Requires JWT authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Post found',
    schema: {
      example: {
        id: 'uuid-123-456',
        title: 'My First Post',
        content: 'This is the content of my first post.',
        authorId: 'user-uuid-789',
        createdAt: '2025-12-13T12:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Not Found - Post not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  getPostById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.postService.findOne(id, user);
  }


  @Patch(':id')
  @ApiOperation({
    summary: 'Update a specific post',
    description: 'Update a specific post by ID. Requires JWT authentication.'
  })
  @ApiBody({
    type: UpdatePostDto,
    description: 'Post data to update (all fields are optional)',
    examples: {
      example1: {
        summary: 'Update title only',
        value: {
          title: 'Updated Post Title'
        }
      },
      example2: {
        summary: 'Update content only',
        value: {
          content: 'This is the updated content.'
        }
      },
      example3: {
        summary: 'Update both fields',
        value: {
          title: 'Updated Post Title',
          content: 'This is the updated content of my post.'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    schema: {
      example: {
        id: 'uuid-123-456',
        title: 'Updated Post Title',
        content: 'This is the updated content of my first post.',
        authorId: 'user-uuid-789',
        createdAt: '2025-12-13T12:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Not Found - Post not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @CurrentUser() user: JwtPayload) {
    return this.postService.update(id, updatePostDto, user);
  }



  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a specific post',
    description: 'Delete a specific post by ID. Requires JWT authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
    schema: {
      example: {
        id: 'uuid-123-456',
        title: 'My First Post',
        content: 'This is the content of my first post.',
        authorId: 'user-uuid-789',
        createdAt: '2025-12-13T12:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Not Found - Post not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  deletePost(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.postService.remove(id, user);
  }
}