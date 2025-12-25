import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) { }

  // conversation.service.ts
  async createPrivateConversation(user1Id: string, user2Id: string) {
    // Validate that both users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: [user1Id, user2Id] },
      },
      select: { id: true },
    });

    if (users.length !== 2) {
      const missingIds = [user1Id, user2Id].filter(
        id => !users.some(u => u.id === id)
      );
      throw new Error(`User(s) not found: ${missingIds.join(', ')}`);
    }

    // check if exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        users: {
          every: { userId: { in: [user1Id, user2Id] } },
        },
      },
    });



    //   const existing = await this.prisma.$queryRaw<Array<{
    //     id: string;
    //     name: string | null;
    //     isGroup: boolean;
    //     ownerId: string | null;
    //     createdAt: Date;
    //     updatedAt: Date;
    //   }>>` select a.*

    // from "Conversation" a
    //   inner join "ConversationUser" b on b."conversationId"=  a.id
    // where "isGroup"= false
    // group by a."id"

    // HAVING COUNT(DISTINCT b."userId") = 2
    // and bool_and(b."userId" in (${user1Id},${user2Id})) ;`

    //   if (existing.length > 0) {
    //     console.log("maderchod already bani hui he conversation")
    //     console.log("exitting is mader4chod", existing)
    //   }


    // if (existing.length > 0) return existing[0]; // return existing conversation
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


    //     const data = await this.prisma.$queryRaw`WITH new_conv AS (
    //   INSERT INTO "Conversation" ("id", "isGroup", "createdAt", "updatedAt")
    //   VALUES (gen_random_uuid(), false, now(), now())
    //   RETURNING *
    // ),
    // ins_users AS (
    //   INSERT INTO "ConversationUser" ("conversationId", "userId", "joinedAt")
    //   SELECT new_conv.id, u.userId, now()
    //   FROM new_conv,
    //        (VALUES ('${user1Id}'), ('${user2Id}')) AS u(userId)
    // )
    // SELECT * FROM new_conv;

    // `;




    // console.log("data is ", data)
    // return data[0];
  }

  async createGroup(name: string, userIds: string[], ownerId: string, iconUrl?: string) {
    // Validate that all users exist (including owner)
    const allUserIds = [...new Set([...userIds, ownerId])]; // Remove duplicates
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: allUserIds },
      },
      select: { id: true },
    });

    if (users.length !== allUserIds.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = allUserIds.filter(id => !foundIds.includes(id));
      throw new Error(`User(s) not found: ${missingIds.join(', ')}`);
    }

    return await this.prisma.conversation.create({
      data: {
        name,
        isGroup: true,
        ownerId,
        iconUrl,
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
            avatarUrl: true,
          },
        },
        attachments: true,
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        }
      },
    });
  }

  // Save message to DB
  async saveMessage(conversationId: string, senderId: string, text: string, attachments?: any[], replyToId?: string) {
    // console.log("text is in savemesage",)
    return await this.prisma.message.create({
      data: {
        content: text,
        senderId,
        conversationId,
        replyToId,
        attachments: attachments ? {
          create: attachments.map(att => ({
            url: att.url,
            key: att.publicId, // Cloudinary publicId
            type: att.resourceType === 'image' ? 'IMAGE' : att.resourceType === 'video' ? 'VIDEO' : 'FILE',
            mimeType: att.mimeType,
            size: att.size || 0
          }))
        } : undefined
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        attachments: true,
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
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
                email: true,
                avatarUrl: true
              }
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            content: true,
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
      data: { content: newText },
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

  async addUsersToGroup(
    conversationId: string,
    userIdsToAdd: string[],
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
      throw new Error('Only the group owner can add users');
    }

    const operations = userIdsToAdd.map((userId) =>
      this.prisma.conversationUser.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId },
        update: {}, // Do nothing if already exists
      }),
    );

    return await this.prisma.$transaction(operations);
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

  // ==================== MESSAGE READ/DELIVERY TRACKING ====================

  /**
   * Mark a message as delivered to a user's device
   */
  async markMessageAsDelivered(messageId: string, userId: string) {
    // Check if message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Don't mark sender's own message as delivered
    if (message.senderId === userId) {
      return null;
    }

    // Create or update MessageRead with deliveredAt
    return await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      create: {
        messageId,
        userId,
        deliveredAt: new Date(),
        readAt: null,
      },
      update: {
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark a message as read by a user
   */
  async markMessageAsRead(messageId: string, userId: string) {
    // Check if message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Don't mark sender's own message as read
    if (message.senderId === userId) {
      return null;
    }

    // Update MessageRead with readAt
    return await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      create: {
        messageId,
        userId,
        deliveredAt: new Date(),
        readAt: new Date(),
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all messages in a conversation as read for a user
   */
  async markConversationAsRead(conversationId: string, userId: string) {
    // Get the latest message in the conversation
    const latestMessage = await this.prisma.message.findFirst({
      where: {
        conversationId,
        senderId: { not: userId }, // Don't include own messages
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestMessage) {
      return null; // No messages to mark as read
    }

    // Get all unread messages in this conversation
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        createdAt: { lte: latestMessage.createdAt },
      },
      select: { id: true },
    });

    // Mark all messages as read
    const messageReadPromises = unreadMessages.map((msg) =>
      this.prisma.messageRead.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId },
        },
        create: {
          messageId: msg.id,
          userId,
          deliveredAt: new Date(),
          readAt: new Date(),
        },
        update: {
          readAt: new Date(),
        },
      })
    );

    await Promise.all(messageReadPromises);

    // Update ConversationRead
    return await this.prisma.conversationRead.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: {
        conversationId,
        userId,
        lastReadMessageId: latestMessage.id,
        lastReadAt: new Date(),
      },
      update: {
        lastReadMessageId: latestMessage.id,
        lastReadAt: new Date(),
      },
    });
  }

  /**
   * Get the read status of a message for all users in the conversation
   */
  async getMessageStatus(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            users: {
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        reads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get all users in conversation except sender
    const conversationUsers = message.conversation.users
      .filter((u) => u.userId !== message.senderId)
      .map((u) => u.user);

    // Map read status for each user
    const readStatus = conversationUsers.map((user) => {
      const readRecord = message.reads.find((r) => r.userId === user.id);

      let status: 'sent' | 'delivered' | 'read' = 'sent';
      if (readRecord?.readAt) {
        status = 'read';
      } else if (readRecord?.deliveredAt) {
        status = 'delivered';
      }

      return {
        user,
        status,
        deliveredAt: readRecord?.deliveredAt || null,
        readAt: readRecord?.readAt || null,
      };
    });

    return {
      messageId: message.id,
      senderId: message.senderId,
      createdAt: message.createdAt,
      readStatus,
    };
  }

  /**
   * Get unread message count for a user in a conversation
   */
  async getUnreadCount(conversationId: string, userId: string) {
    // Get the last read message timestamp
    const conversationRead = await this.prisma.conversationRead.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    const lastReadAt = conversationRead?.lastReadAt || new Date(0);

    // Count messages created after last read time, excluding own messages
    return await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        createdAt: { gt: lastReadAt },
      },
    });
  }

  /**
   * Get all conversations with unread counts for a user
   */
  async getUserConversationsWithUnreadCounts(userId: string) {
    const conversations = await this.getUserConversations(userId);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.getUnreadCount(conv.id, userId);
        return {
          ...conv,
          unreadCount,
        };
      })
    );

    return conversationsWithUnread;
  }

  /**
   * Get messages with read status for a conversation
   */
  async getMessagesWithReadStatus(conversationId: string, userId: string) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        reads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Add read status to each message
    return messages.map((message) => {
      const myReadStatus = message.reads.find((r) => r.userId === userId);

      let status: 'sent' | 'delivered' | 'read' = 'sent';
      if (message.senderId === userId) {
        // For sent messages, check if others have read
        const othersRead = message.reads.filter((r) => r.userId !== userId);
        const allRead = othersRead.every((r) => r.readAt);
        const anyDelivered = othersRead.some((r) => r.deliveredAt);

        if (allRead && othersRead.length > 0) {
          status = 'read';
        } else if (anyDelivered) {
          status = 'delivered';
        }
      } else {
        // For received messages
        if (myReadStatus?.readAt) {
          status = 'read';
        } else if (myReadStatus?.deliveredAt) {
          status = 'delivered';
        }
      }

      return {
        ...message,
        status,
        deliveredAt: myReadStatus?.deliveredAt || null,
        readAt: myReadStatus?.readAt || null,
      };
    });
  }

  /**
   * Update group icon (only owner can update)
   */
  async updateGroupIcon(conversationId: string, userId: string, iconUrl: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new Error('This is not a group conversation');
    }

    if (conversation.ownerId !== userId) {
      throw new Error('Only the group owner can update the group icon');
    }

    return await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { iconUrl },
      include: {
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update group name (only owner can update)
   */
  async updateGroupName(conversationId: string, userId: string, name: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.isGroup) {
      throw new Error('This is not a group conversation');
    }

    if (conversation.ownerId !== userId) {
      throw new Error('Only the group owner can update the group name');
    }

    return await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { name },
      include: {
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
