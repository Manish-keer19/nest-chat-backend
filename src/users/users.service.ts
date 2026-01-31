import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async getAllUsers() {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
        provider: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    // Check if username is being changed and if it's already taken
    if (updateData.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateData.username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
        provider: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
      },
    });
  }
  async setOnlineStatus(userId: string, isOnline: boolean) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: isOnline ? null : new Date(),
      },
    });
  }

  async getUsersPresence(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    return users.reduce((acc, user) => {
      acc[user.id] = {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      };
      return acc;
    }, {});
  }

  /**
   * Delete all users with @testmail.com email addresses and their associated data
   * This is a comprehensive cleanup operation that removes:
   * - Users and their profiles
   * - All posts, comments, likes, and attachments
   * - All messages and conversations
   * - All calls and call participants
   * - All follow relationships
   */
  async deleteTestmailUsers() {
    // Find all users with @testmail.com email
    const testmailUsers = await this.prisma.user.findMany({
      where: {
        email: {
          endsWith: '@testmail.com',
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (testmailUsers.length === 0) {
      return {
        success: true,
        message: 'No users with @testmail.com email found',
        stats: {},
      };
    }

    const userIds = testmailUsers.map((user) => user.id);

    // Track deletion statistics
    const stats = {
      users: 0,
      posts: 0,
      comments: 0,
      likes: 0,
      attachments: 0,
      postStats: 0,
      messages: 0,
      messageReads: 0,
      conversationUsers: 0,
      conversationReads: 0,
      conversations: 0,
      follows: 0,
      calls: 0,
      callParticipants: 0,
      callEvents: 0,
    };

    // Delete user follows
    const deletedFollows = await this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: { in: userIds } },
          { followingId: { in: userIds } },
        ],
      },
    });
    stats.follows = deletedFollows.count;

    // Get all post IDs created by these users
    const userPosts = await this.prisma.post.findMany({
      where: { authorId: { in: userIds } },
      select: { id: true },
    });
    const postIds = userPosts.map((post) => post.id);

    if (postIds.length > 0) {
      // Delete likes on these posts
      const deletedLikes = await this.prisma.like.deleteMany({
        where: { postId: { in: postIds } },
      });
      stats.likes = deletedLikes.count;

      // Delete comments on these posts
      const deletedComments = await this.prisma.comment.deleteMany({
        where: { postId: { in: postIds } },
      });
      stats.comments = deletedComments.count;

      // Delete post attachments
      const deletedPostAttachments = await this.prisma.attachment.deleteMany({
        where: { postId: { in: postIds } },
      });
      stats.attachments += deletedPostAttachments.count;

      // Delete post stats
      const deletedPostStats = await this.prisma.postStats.deleteMany({
        where: { postId: { in: postIds } },
      });
      stats.postStats = deletedPostStats.count;

      // Delete posts
      const deletedPosts = await this.prisma.post.deleteMany({
        where: { id: { in: postIds } },
      });
      stats.posts = deletedPosts.count;
    }

    // Get all message IDs sent by these users
    const userMessages = await this.prisma.message.findMany({
      where: { senderId: { in: userIds } },
      select: { id: true },
    });
    const messageIds = userMessages.map((msg) => msg.id);

    if (messageIds.length > 0) {
      // Delete message reads
      const deletedMessageReads = await this.prisma.messageRead.deleteMany({
        where: {
          OR: [
            { messageId: { in: messageIds } },
            { userId: { in: userIds } },
          ],
        },
      });
      stats.messageReads = deletedMessageReads.count;

      // Delete message attachments
      const deletedMessageAttachments = await this.prisma.attachment.deleteMany({
        where: { messageId: { in: messageIds } },
      });
      stats.attachments += deletedMessageAttachments.count;

      // Delete messages
      const deletedMessages = await this.prisma.message.deleteMany({
        where: { id: { in: messageIds } },
      });
      stats.messages = deletedMessages.count;
    }

    // Delete conversation reads
    const deletedConversationReads = await this.prisma.conversationRead.deleteMany({
      where: { userId: { in: userIds } },
    });
    stats.conversationReads = deletedConversationReads.count;

    // Delete conversation users
    const deletedConversationUsers = await this.prisma.conversationUser.deleteMany({
      where: { userId: { in: userIds } },
    });
    stats.conversationUsers = deletedConversationUsers.count;

    // Delete conversations owned by these users
    const deletedConversations = await this.prisma.conversation.deleteMany({
      where: { ownerId: { in: userIds } },
    });
    stats.conversations = deletedConversations.count;

    // Get all call IDs initiated by these users
    const userCalls = await this.prisma.call.findMany({
      where: { initiatorId: { in: userIds } },
      select: { id: true },
    });
    const callIds = userCalls.map((call) => call.id);

    if (callIds.length > 0) {
      // Delete call events
      const deletedCallEvents = await this.prisma.callEvent.deleteMany({
        where: { callId: { in: callIds } },
      });
      stats.callEvents = deletedCallEvents.count;

      // Delete call participants
      const deletedCallParticipants = await this.prisma.callParticipant.deleteMany({
        where: {
          OR: [
            { callId: { in: callIds } },
            { userId: { in: userIds } },
          ],
        },
      });
      stats.callParticipants = deletedCallParticipants.count;

      // Delete calls
      const deletedCalls = await this.prisma.call.deleteMany({
        where: { id: { in: callIds } },
      });
      stats.calls = deletedCalls.count;
    }

    // Finally, delete the users
    const deletedUsers = await this.prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    stats.users = deletedUsers.count;

    return {
      success: true,
      message: `Successfully deleted ${stats.users} test user(s) and all their associated data`,
      deletedUsers: testmailUsers.map(u => ({ username: u.username, email: u.email })),
      stats,
    };
  }
}
