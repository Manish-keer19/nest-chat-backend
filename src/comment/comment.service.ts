import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCommentDto } from './dto/creatCommentDto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AppLogger } from 'src/config/logger.config';

@Injectable()
export class CommentService {
    private readonly logger = new AppLogger(CommentService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new comment (top-level or nested reply)
     * 
     * @param postId - ID of the post being commented on
     * @param dto - Comment data (text and optional parentId)
     * @param user - Authenticated user
     */
    async create(postId: string, dto: CreateCommentDto, user: JwtPayload) {
        // Validate that the post exists
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            this.logger.warn(`Attempt to comment on non-existent post: ${postId}`);
            throw new NotFoundException(`Post with ID ${postId} not found`);
        }

        // If parentId is provided, validate that the parent comment exists
        if (dto.parentId) {
            const parentComment = await this.prisma.comment.findUnique({
                where: { id: dto.parentId },
            });

            if (!parentComment) {
                this.logger.warn(`Attempt to reply to non-existent comment: ${dto.parentId}`);
                throw new NotFoundException(`Parent comment with ID ${dto.parentId} not found`);
            }

            // Ensure parent comment belongs to the same post
            if (parentComment.postId !== postId) {
                this.logger.warn(
                    `Parent comment ${dto.parentId} does not belong to post ${postId}`
                );
                throw new BadRequestException(
                    'Parent comment does not belong to this post'
                );
            }
        }

        // Create the comment
        const comment = await this.prisma.comment.create({
            data: {
                text: dto.text,
                userId: user.sub,
                postId: postId,
                parentId: dto.parentId || null, // null for top-level comments
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                // Include parent comment info if it's a reply
                parent: dto.parentId ? {
                    select: {
                        id: true,
                        text: true,
                        user: {
                            select: {
                                username: true,
                            },
                        },
                    },
                } : false,
            },
        });

        this.logger.log(
            `Comment created: ${comment.id} on post ${postId} by user ${user.sub}` +
            (dto.parentId ? ` (reply to ${dto.parentId})` : ' (top-level)')
        );

        return comment;
    }

    /**
     * Get all comments for a post (with UNLIMITED nested structure)
     * Uses recursive approach to fetch all levels
     */
    async findByPost(postId: string) {


        const post = await this.prisma.post.findUnique({
            where: {
                id: postId
            }
        })

        if (!post) {
            this.logger.error("there is not post in the given postID")
            throw new NotFoundException("PostID is not found")
        }


        return await this.prisma.comment.findMany({
            where: {
                postId: postId,
                parentId: null
            },
            select: {
                id: true,
                text: true,
                postId: true,
                userId: true,
                parentId: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                _count: {
                    select: {
                        replies: true  // Count of direct replies
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'  // Newest first for top-level comments
            }
        })

    }

    async remove(commentId: string, user: JwtPayload) {
        // Check ownership first
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw new Error("Comment not found");

        if (comment.userId !== user.sub) throw new Error("Unauthorized");

        return await this.prisma.comment.delete({
            where: { id: commentId }
        });
    }

    /**
     * Get direct replies for a specific comment (lazy loading nested comments)
     * This allows frontend to load nested comments on demand
     */
    async getSubComment(commentId: string) {
        // Verify the parent comment exists
        const parentComment = await this.prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!parentComment) {
            this.logger.warn(`Attempt to fetch replies for non-existent comment: ${commentId}`);
            throw new NotFoundException(`Comment with ID ${commentId} not found`);
        }

        // Get direct replies only (not nested deeper)
        const replies = await this.prisma.comment.findMany({
            where: {
                parentId: commentId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        replies: true, // Count of nested replies
                    },
                },
            },
            orderBy: {
                createdAt: 'asc', // Oldest first for replies
            },
        });

        this.logger.log(`Fetched ${replies.length} replies for comment ${commentId}`);
        return replies;
    }

}

