import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) { }

  // conversation.service.ts
  async createPrivateConversation(user1Id: string, user2Id: string) {
    // check if exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        users: {
          every: { userId: { in: [user1Id, user2Id] } },
        },
      },
    });

    if (existing) return existing; // return existing conversation

    // create new one
    return await this.prisma.conversation.create({
      data: {
        isGroup: false,
        users: {
          create: [{ userId: user1Id }, { userId: user2Id }],
        },
      },
    });
  }

  async createGroup(name: string, userIds: string[], ownerId: string) {
    return await this.prisma.conversation.create({
      data: {
        name,
        isGroup: true,
        ownerId,
        users: {
          create: userIds.map((id) => ({ userId: id })),
        },
      },
    });
  }

  async getMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Save message to DB
  async saveMessage(conversationId: string, senderId: string, text: string) {
    return await this.prisma.message.create({
      data: {
        text,
        senderId,
        conversationId,
      },
      include: {
        sender: { select: { username: true } },
      },
    });
  }


  // Create private conversation (1-to-1)
  async createConversation(user1Id: string, user2Id: string) {
    return await this.prisma.conversation.create({
      data: {
        isGroup: false,
        users: {
          create: [{ userId: user1Id }, { userId: user2Id }],
        },
      },
    });
  }

  // Get conversations for a user
  async getUserConversations(userId: string) {
    return await this.prisma.conversation.findMany({
      where: {
        users: { some: { userId } },
      },
      include: {
        users: {
          select: {
            userId: true,
            conversationId: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            text: true,
            createdAt: true,
          }
        },
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  // Make sure user is part of conversation
  async isUserInConversation(conversationId: string, userId: string) {
    const exists = await this.prisma.conversationUser.findFirst({
      where: { conversationId, userId },
    });
    return !!exists;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.senderId !== userId) {
      throw new Error('Cannot delete message');
    }
    return await this.prisma.message.delete({ where: { id: messageId } });
  }

  async editMessage(messageId: string, userId: string, newText: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.senderId !== userId) {
      throw new Error('Cannot edit message');
    }
    return await this.prisma.message.update({
      where: { id: messageId },
      data: { text: newText },
    });
  }

  async addUserToGroup(
    conversationId: string,
    userIdToAdd: string,
    requesterId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new Error('Conversation not found');
    // If it's a group, only owner can add. If it's not a group, we probably can't add users anyway (private chat logic).
    // Assuming assuming isGroup check is implicit or we want to enforce it.
    if (
      conversation.isGroup &&
      conversation.ownerId &&
      conversation.ownerId !== requesterId
    ) {
      throw new Error('Only the group owner can add users');
    }

    const exists = await this.prisma.conversationUser.findUnique({
      where: { conversationId_userId: { conversationId, userId: userIdToAdd } },
    });
    if (exists) return exists;

    return await this.prisma.conversationUser.create({
      data: { conversationId, userId: userIdToAdd },
    });
  }

  async removeUserFromGroup(
    conversationId: string,
    userIdToRemove: string,
    requesterId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new Error('Conversation not found');
    if (
      conversation.isGroup &&
      conversation.ownerId &&
      conversation.ownerId !== requesterId
    ) {
      // Allow user to leave group themselves? Maybe. But requirement says "who did creat teh group that person can add new user also remove new user"
      // So strictly ONLY owner can remove? Or maybe owner can remove ANYONE, and user can remove THEMSELVES?
      // Let's stick to "Owner can remove users".
      // If requesterId === userIdToRemove, it's "leaving". We should allow that.
      if (userIdToRemove !== requesterId) {
        throw new Error('Only the group owner can remove users');
      }
    }

    return await this.prisma.conversationUser.delete({
      where: {
        conversationId_userId: { conversationId, userId: userIdToRemove },
      },
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new Error('Conversation not found');

    // If it's a group, strictly enforce owner check
    if (conversation.isGroup) {
      if (conversation.ownerId !== userId) {
        throw new Error('Only the group owner can delete the group');
      }
    } else {
      // For private chats, maybe verify user is part of it?
      // User requested "group owner can delete group".
      // Let's stick to that scope. If it's private, maybe allow deletion if user is in it?
      // For now, let's assume this endpoint is mainly for groups as per request.
      // But purely for safety:
      const isIn = await this.isUserInConversation(conversationId, userId);
      if (!isIn) throw new Error('You are not part of this conversation');
    }

    // Delete related first (unless schema has cascading delete, which we didn't strictly check/enforce)
    // Safest to delete related manually in transaction or order
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { conversationId } }),
      this.prisma.conversationUser.deleteMany({ where: { conversationId } }),
      this.prisma.conversation.delete({ where: { id: conversationId } }),
    ]);

    return { success: true };
  }
}
