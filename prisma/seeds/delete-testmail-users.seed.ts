import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma Client with the same configuration as PrismaService
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Seed file to delete all users with @testmail.com email addresses
 * and all their associated data across the entire database.
 * 
 * This will cascade delete:
 * - User's posts and associated data (likes, comments, attachments, stats)
 * - User's messages and message reads
 * - User's conversations and conversation reads
 * - User's calls and call participants
 * - User's follows (as follower and following)
 * - All other user-related data
 */
async function deleteTestmailUsers() {


    console.log('🗑️  Starting deletion of @testmail.com users and their data...\n');

    try {
        // Find all users with @testmail.com email
        const testmailUsers = await prisma.user.findMany({
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
            console.log('✅ No users with @testmail.com email found. Nothing to delete.');
            return;
        }

        console.log(`📊 Found ${testmailUsers.length} user(s) with @testmail.com email:\n`);
        testmailUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.username} (${user.email})`);
        });
        console.log('\n');

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

        // ==================== DELETE USER-RELATED DATA ====================

        console.log('🔄 Step 1: Deleting user follows...');
        const deletedFollows = await prisma.follow.deleteMany({
            where: {
                OR: [
                    { followerId: { in: userIds } },
                    { followingId: { in: userIds } },
                ],
            },
        });
        stats.follows = deletedFollows.count;
        console.log(`   ✓ Deleted ${deletedFollows.count} follow relationships\n`);

        // ==================== DELETE POST-RELATED DATA ====================

        console.log('🔄 Step 2: Deleting post-related data...');

        // Get all post IDs created by these users
        const userPosts = await prisma.post.findMany({
            where: { authorId: { in: userIds } },
            select: { id: true },
        });
        const postIds = userPosts.map((post) => post.id);

        if (postIds.length > 0) {
            // Delete likes on these posts
            const deletedLikes = await prisma.like.deleteMany({
                where: { postId: { in: postIds } },
            });
            stats.likes = deletedLikes.count;
            console.log(`   ✓ Deleted ${deletedLikes.count} likes`);

            // Delete comments on these posts (including nested replies)
            const deletedComments = await prisma.comment.deleteMany({
                where: { postId: { in: postIds } },
            });
            stats.comments = deletedComments.count;
            console.log(`   ✓ Deleted ${deletedComments.count} comments`);

            // Delete attachments on these posts
            const deletedPostAttachments = await prisma.attachment.deleteMany({
                where: { postId: { in: postIds } },
            });
            stats.attachments += deletedPostAttachments.count;
            console.log(`   ✓ Deleted ${deletedPostAttachments.count} post attachments`);

            // Delete post stats
            const deletedPostStats = await prisma.postStats.deleteMany({
                where: { postId: { in: postIds } },
            });
            stats.postStats = deletedPostStats.count;
            console.log(`   ✓ Deleted ${deletedPostStats.count} post stats`);

            // Delete posts
            const deletedPosts = await prisma.post.deleteMany({
                where: { id: { in: postIds } },
            });
            stats.posts = deletedPosts.count;
            console.log(`   ✓ Deleted ${deletedPosts.count} posts\n`);
        } else {
            console.log(`   ✓ No posts to delete\n`);
        }

        // ==================== DELETE MESSAGE-RELATED DATA ====================

        console.log('🔄 Step 3: Deleting message-related data...');

        // Get all message IDs sent by these users
        const userMessages = await prisma.message.findMany({
            where: { senderId: { in: userIds } },
            select: { id: true },
        });
        const messageIds = userMessages.map((msg) => msg.id);

        if (messageIds.length > 0) {
            // Delete message reads (CASCADE will handle this, but being explicit)
            const deletedMessageReads = await prisma.messageRead.deleteMany({
                where: {
                    OR: [
                        { messageId: { in: messageIds } },
                        { userId: { in: userIds } },
                    ],
                },
            });
            stats.messageReads = deletedMessageReads.count;
            console.log(`   ✓ Deleted ${deletedMessageReads.count} message reads`);

            // Delete message attachments
            const deletedMessageAttachments = await prisma.attachment.deleteMany({
                where: { messageId: { in: messageIds } },
            });
            stats.attachments += deletedMessageAttachments.count;
            console.log(`   ✓ Deleted ${deletedMessageAttachments.count} message attachments`);

            // Delete messages
            const deletedMessages = await prisma.message.deleteMany({
                where: { id: { in: messageIds } },
            });
            stats.messages = deletedMessages.count;
            console.log(`   ✓ Deleted ${deletedMessages.count} messages\n`);
        } else {
            console.log(`   ✓ No messages to delete\n`);
        }

        // ==================== DELETE CONVERSATION-RELATED DATA ====================

        console.log('🔄 Step 4: Deleting conversation-related data...');

        // Delete conversation reads (CASCADE will handle this)
        const deletedConversationReads = await prisma.conversationRead.deleteMany({
            where: { userId: { in: userIds } },
        });
        stats.conversationReads = deletedConversationReads.count;
        console.log(`   ✓ Deleted ${deletedConversationReads.count} conversation reads`);

        // Delete conversation users
        const deletedConversationUsers = await prisma.conversationUser.deleteMany({
            where: { userId: { in: userIds } },
        });
        stats.conversationUsers = deletedConversationUsers.count;
        console.log(`   ✓ Deleted ${deletedConversationUsers.count} conversation memberships`);

        // Delete conversations owned by these users
        const deletedConversations = await prisma.conversation.deleteMany({
            where: { ownerId: { in: userIds } },
        });
        stats.conversations = deletedConversations.count;
        console.log(`   ✓ Deleted ${deletedConversations.count} owned conversations\n`);

        // ==================== DELETE CALL-RELATED DATA ====================

        console.log('🔄 Step 5: Deleting call-related data...');

        // Get all call IDs initiated by these users
        const userCalls = await prisma.call.findMany({
            where: { initiatorId: { in: userIds } },
            select: { id: true },
        });
        const callIds = userCalls.map((call) => call.id);

        if (callIds.length > 0) {
            // Delete call events (CASCADE will handle this)
            const deletedCallEvents = await prisma.callEvent.deleteMany({
                where: { callId: { in: callIds } },
            });
            stats.callEvents = deletedCallEvents.count;
            console.log(`   ✓ Deleted ${deletedCallEvents.count} call events`);

            // Delete call participants (CASCADE will handle this)
            const deletedCallParticipants = await prisma.callParticipant.deleteMany({
                where: {
                    OR: [
                        { callId: { in: callIds } },
                        { userId: { in: userIds } },
                    ],
                },
            });
            stats.callParticipants = deletedCallParticipants.count;
            console.log(`   ✓ Deleted ${deletedCallParticipants.count} call participants`);

            // Delete calls
            const deletedCalls = await prisma.call.deleteMany({
                where: { id: { in: callIds } },
            });
            stats.calls = deletedCalls.count;
            console.log(`   ✓ Deleted ${deletedCalls.count} calls\n`);
        } else {
            console.log(`   ✓ No calls to delete\n`);
        }

        // ==================== DELETE USERS ====================

        console.log('🔄 Step 6: Deleting users...');
        const deletedUsers = await prisma.user.deleteMany({
            where: { id: { in: userIds } },
        });
        stats.users = deletedUsers.count;
        console.log(`   ✓ Deleted ${deletedUsers.count} users\n`);

        // ==================== SUMMARY ====================

        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 DELETION SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`👥 Users:                    ${stats.users}`);
        console.log(`📝 Posts:                    ${stats.posts}`);
        console.log(`💬 Comments:                 ${stats.comments}`);
        console.log(`❤️  Likes:                    ${stats.likes}`);
        console.log(`📎 Attachments:              ${stats.attachments}`);
        console.log(`📊 Post Stats:               ${stats.postStats}`);
        console.log(`💌 Messages:                 ${stats.messages}`);
        console.log(`👁️  Message Reads:            ${stats.messageReads}`);
        console.log(`🗨️  Conversation Memberships: ${stats.conversationUsers}`);
        console.log(`📖 Conversation Reads:       ${stats.conversationReads}`);
        console.log(`💬 Owned Conversations:      ${stats.conversations}`);
        console.log(`🤝 Follow Relationships:     ${stats.follows}`);
        console.log(`📞 Calls:                    ${stats.calls}`);
        console.log(`👤 Call Participants:        ${stats.callParticipants}`);
        console.log(`📋 Call Events:              ${stats.callEvents}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n✅ Successfully deleted all @testmail.com users and their data!');
    } catch (error) {
        console.error('\n❌ Error during deletion:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed
deleteTestmailUsers()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
