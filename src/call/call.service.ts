import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallType, CallStatus, CallParticipantStatus, CallEventType } from '../../generated/prisma/client';

@Injectable()
export class CallService {
    constructor(private prisma: PrismaService) { }

    /**
     * Initiate a new call
     */
    async initiateCall(
        initiatorId: string,
        recipientIds: string[],
        callType: CallType,
        conversationId?: string,
    ) {
        // Validate recipients exist
        const recipients = await this.prisma.user.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, username: true, avatarUrl: true },
        });

        if (recipients.length !== recipientIds.length) {
            throw new BadRequestException('One or more recipients not found');
        }

        // Create call
        const call = await this.prisma.call.create({
            data: {
                initiatorId,
                callType,
                conversationId,
                status: CallStatus.CALLING,
                participants: {
                    create: [
                        // Add initiator as participant
                        {
                            userId: initiatorId,
                            status: CallParticipantStatus.JOINED,
                            joinedAt: new Date(),
                        },
                        // Add recipients as invited
                        ...recipientIds.map((userId) => ({
                            userId,
                            status: CallParticipantStatus.INVITED,
                        })),
                    ],
                },
                events: {
                    create: {
                        eventType: CallEventType.CALL_INITIATED,
                        userId: initiatorId,
                    },
                },
            },
            include: {
                initiator: {
                    select: { id: true, username: true, avatarUrl: true },
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                },
            },
        });

        return call;
    }

    /**
     * Update call status to RINGING
     */
    async markCallAsRinging(callId: string, userId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        // Update participant status
        await this.prisma.callParticipant.updateMany({
            where: {
                callId,
                userId,
            },
            data: {
                status: CallParticipantStatus.RINGING,
            },
        });

        // Update call status if not already active
        if (call.status === CallStatus.CALLING) {
            await this.prisma.call.update({
                where: { id: callId },
                data: { status: CallStatus.RINGING },
            });
        }

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.CALL_RINGING,
            },
        });

        return { success: true };
    }

    /**
     * Accept a call
     */
    async acceptCall(callId: string, userId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: { participants: true },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        // Check if user is a participant
        const participant = call.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new BadRequestException('User is not a participant in this call');
        }

        // Update participant status
        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: {
                status: CallParticipantStatus.JOINED,
                joinedAt: new Date(),
            },
        });

        // Update call status to ACTIVE
        await this.prisma.call.update({
            where: { id: callId },
            data: { status: CallStatus.ACTIVE },
        });

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.CALL_ACCEPTED,
            },
        });

        return { success: true };
    }

    /**
     * Reject a call
     */
    async rejectCall(callId: string, userId: string, reason?: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: { participants: true },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        const participant = call.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new BadRequestException('User is not a participant in this call');
        }

        // Update participant status
        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: {
                status: CallParticipantStatus.REJECTED,
                leftAt: new Date(),
            },
        });

        // If 1-to-1 call, mark entire call as rejected
        if (
            call.callType === CallType.AUDIO_1TO1 ||
            call.callType === CallType.VIDEO_1TO1
        ) {
            await this.prisma.call.update({
                where: { id: callId },
                data: {
                    status: CallStatus.REJECTED,
                    endedAt: new Date(),
                },
            });
        }

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.CALL_REJECTED,
                metadata: reason ? { reason } : undefined,
            },
        });

        return { success: true };
    }

    /**
     * End a call
     */
    async endCall(callId: string, userId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: { participants: true },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        const endedAt = new Date();
        const duration = Math.floor(
            (endedAt.getTime() - call.startedAt.getTime()) / 1000,
        );

        // Update call
        await this.prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.ENDED,
                endedAt,
                duration,
            },
        });

        // Update all active participants
        await this.prisma.callParticipant.updateMany({
            where: {
                callId,
                status: CallParticipantStatus.JOINED,
            },
            data: {
                status: CallParticipantStatus.LEFT,
                leftAt: endedAt,
            },
        });

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.CALL_ENDED,
            },
        });

        return { success: true, duration };
    }

    /**
     * Join a group call
     */
    async joinGroupCall(callId: string, userId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: { participants: true },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        // Check if group call
        if (
            call.callType !== CallType.AUDIO_GROUP &&
            call.callType !== CallType.VIDEO_GROUP
        ) {
            throw new BadRequestException('This is not a group call');
        }

        // Check if user is already a participant
        let participant = call.participants.find((p) => p.userId === userId);

        if (participant) {
            // Update existing participant
            await this.prisma.callParticipant.update({
                where: { id: participant.id },
                data: {
                    status: CallParticipantStatus.JOINED,
                    joinedAt: new Date(),
                },
            });
        } else {
            // Add new participant
            await this.prisma.callParticipant.create({
                data: {
                    callId,
                    userId,
                    status: CallParticipantStatus.JOINED,
                    joinedAt: new Date(),
                },
            });
        }

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.PARTICIPANT_JOINED,
            },
        });

        return { success: true };
    }

    /**
     * Leave a group call
     */
    async leaveGroupCall(callId: string, userId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: { participants: true },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        const participant = call.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new BadRequestException('User is not a participant in this call');
        }

        // Update participant
        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: {
                status: CallParticipantStatus.LEFT,
                leftAt: new Date(),
            },
        });

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: CallEventType.PARTICIPANT_LEFT,
            },
        });

        // Check if all participants have left
        const activeParticipants = await this.prisma.callParticipant.count({
            where: {
                callId,
                status: CallParticipantStatus.JOINED,
            },
        });

        // If no active participants, end the call
        if (activeParticipants === 0) {
            await this.endCall(callId, userId);
        }

        return { success: true };
    }

    /**
     * Toggle mute status
     */
    async toggleMute(callId: string, userId: string, isMuted: boolean) {
        const participant = await this.prisma.callParticipant.findFirst({
            where: { callId, userId },
        });

        if (!participant) {
            throw new NotFoundException('Participant not found');
        }

        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: { isMuted },
        });

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: isMuted
                    ? CallEventType.PARTICIPANT_MUTED
                    : CallEventType.PARTICIPANT_UNMUTED,
            },
        });

        return { success: true };
    }

    /**
     * Toggle video status
     */
    async toggleVideo(callId: string, userId: string, isVideoOff: boolean) {
        const participant = await this.prisma.callParticipant.findFirst({
            where: { callId, userId },
        });

        if (!participant) {
            throw new NotFoundException('Participant not found');
        }

        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: { isVideoOff },
        });

        // Log event
        await this.prisma.callEvent.create({
            data: {
                callId,
                userId,
                eventType: isVideoOff
                    ? CallEventType.VIDEO_DISABLED
                    : CallEventType.VIDEO_ENABLED,
            },
        });

        return { success: true };
    }

    /**
     * Get call details
     */
    async getCall(callId: string) {
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
            include: {
                initiator: {
                    select: { id: true, username: true, avatarUrl: true },
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                },
                events: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!call) {
            throw new NotFoundException('Call not found');
        }

        return call;
    }

    /**
     * Get user's call history
     */
    async getUserCallHistory(userId: string, limit = 50) {
        const calls = await this.prisma.call.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                initiator: {
                    select: { id: true, username: true, avatarUrl: true },
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: limit,
        });

        return calls;
    }

    /**
     * Mark call as missed
     */
    async markCallAsMissed(callId: string, userId: string) {
        const participant = await this.prisma.callParticipant.findFirst({
            where: { callId, userId },
        });

        if (!participant) {
            throw new NotFoundException('Participant not found');
        }

        await this.prisma.callParticipant.update({
            where: { id: participant.id },
            data: { status: CallParticipantStatus.MISSED },
        });

        // Update call status to MISSED if 1-to-1
        const call = await this.prisma.call.findUnique({
            where: { id: callId },
        });

        if (
            call &&
            (call.callType === CallType.AUDIO_1TO1 ||
                call.callType === CallType.VIDEO_1TO1)
        ) {
            await this.prisma.call.update({
                where: { id: callId },
                data: {
                    status: CallStatus.MISSED,
                    endedAt: new Date(),
                },
            });
        }

        return { success: true };
    }
    /**
     * Get active call for a conversation
     */
    async getActiveCallForConversation(conversationId: string) {
        const call = await this.prisma.call.findFirst({
            where: {
                conversationId,
                status: {
                    in: [CallStatus.CALLING, CallStatus.RINGING, CallStatus.ACTIVE],
                },
            },
            include: {
                initiator: {
                    select: { id: true, username: true, avatarUrl: true },
                },
                participants: {
                    where: {
                        status: CallParticipantStatus.JOINED,
                    },
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
        });

        return call;
    }
}
