import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './dto/creatCommentDto';
import { CommentService } from './comment.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@ApiTags('Comments')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommentController {
    constructor(private readonly commentService: CommentService) { }

    /**
     * Create a comment (top-level or nested reply)
     */
    @Post(':postId/comments')
    @ApiOperation({
        summary: 'Create a comment on a post',
        description: 'Creates a new comment on a specific post. Can be a top-level comment or a reply to another comment. The authenticated user will be set as the comment author.'
    })
    @ApiParam({
        name: 'postId',
        description: 'The ID of the post to comment on',
        type: String,
        example: 'cm5abc123xyz'
    })
    @ApiBody({
        type: CreateCommentDto,
        description: 'Comment data to create',
        examples: {
            topLevelComment: {
                summary: 'Top-level Comment',
                value: {
                    text: 'This is a great post! Thanks for sharing.'
                }
            },
            nestedReply: {
                summary: 'Reply to Another Comment',
                value: {
                    text: 'I totally agree with your point!',
                    parentId: 'cm5comment789'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Comment created successfully',
        schema: {
            example: {
                id: 'cm5comment456',
                text: 'This is a great post!',
                postId: 'cm5abc123xyz',
                userId: 'cm5user789',
                parentId: null,
                createdAt: '2025-12-21T09:00:00.000Z',
                updatedAt: '2025-12-21T09:00:00.000Z',
                user: {
                    id: 'cm5user789',
                    username: 'john_doe',
                    email: 'john@example.com'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 404, description: 'Not Found - Post or parent comment not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    createComment(
        @Param('postId') postId: string,
        @Body() dto: CreateCommentDto,
        @CurrentUser() user: JwtPayload
    ) {
        return this.commentService.create(postId, dto, user);
    }

    /**
     * Get all comments for a post (with nested structure)
     */
    @Get(':postId/comments')
    @ApiOperation({
        summary: 'Get all comments for a post',
        description: 'Retrieves all comments for a specific post, including nested replies. Comments are ordered by creation date (newest first).'
    })
    @ApiParam({
        name: 'postId',
        description: 'The ID of the post',
        type: String,
        example: 'cm5abc123xyz'
    })
    @ApiResponse({
        status: 200,
        description: 'Comments retrieved successfully',
        schema: {
            example: [
                {
                    id: 'cm5comment1',
                    text: 'Great post!',
                    postId: 'cm5abc123xyz',
                    userId: 'cm5user1',
                    parentId: null,
                    createdAt: '2025-12-21T09:00:00.000Z',
                    user: {
                        id: 'cm5user1',
                        username: 'alice',
                        email: 'alice@example.com'
                    },
                    replies: [
                        {
                            id: 'cm5comment2',
                            text: 'I agree!',
                            parentId: 'cm5comment1',
                            user: {
                                username: 'bob'
                            }
                        }
                    ]
                }
            ]
        }
    })
    @ApiResponse({ status: 404, description: 'Not Found - Post not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    getComments(@Param('postId') postId: string) {
        return this.commentService.findByPost(postId);
    }

    /**
     * Delete a comment (only by the author)
     */
    @Delete('comments/:commentId')
    @ApiOperation({
        summary: 'Delete a comment',
        description: 'Deletes a comment. Only the comment author can delete their own comments.'
    })
    @ApiParam({
        name: 'commentId',
        description: 'The ID of the comment to delete',
        type: String,
        example: 'cm5comment456'
    })
    @ApiResponse({
        status: 200,
        description: 'Comment deleted successfully',
        schema: {
            example: {
                message: 'Comment deleted successfully'
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request - You can only delete your own comments' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 404, description: 'Not Found - Comment not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    deleteComment(
        @Param('commentId') commentId: string,
        @CurrentUser() user: JwtPayload
    ) {
        return this.commentService.remove(commentId, user);
    }
    /**
     * Get nested replies for a specific comment (lazy loading)
     */
    @Get('comments/:commentId/replies')
    @ApiOperation({
        summary: 'Get replies for a comment',
        description: 'Fetches direct replies for a specific comment. Use this for lazy-loading nested comments. Returns only direct children, not deeper nesting.'
    })
    @ApiParam({
        name: 'commentId',
        description: 'The ID of the parent comment',
        type: String,
        example: 'cm5comment123'
    })
    @ApiResponse({
        status: 200,
        description: 'Replies fetched successfully',
        schema: {
            example: [
                {
                    id: 'cm5reply1',
                    text: 'This is a reply',
                    postId: 'cm5post123',
                    userId: 'cm5user456',
                    parentId: 'cm5comment123',
                    createdAt: '2025-12-22T10:00:00.000Z',
                    user: {
                        id: 'cm5user456',
                        username: 'jane_doe',
                        email: 'jane@example.com',
                        avatarUrl: null
                    },
                    _count: {
                        replies: 3  // Number of nested replies
                    }
                }
            ]
        }
    })
    @ApiResponse({ status: 404, description: 'Not Found - Comment not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getSubComment(@Param('commentId') commentId: string) {
        return this.commentService.getSubComment(commentId);
    }
}

