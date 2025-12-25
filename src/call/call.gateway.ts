import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CallService } from './call.service';
import { CallType } from '../../generated/prisma/client';
import { UseGuards } from '@nestjs/common';

// User data attached to socket
interface SocketWithUser extends Socket {
    data: {
        userId?: string;
        username?: string;
    };
}

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/call', // Separate namespace for calls
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track active calls and participants
    private activeCalls = new Map<string, Set<string>>(); // callId -> Set of socketIds

    constructor(private callService: CallService) { }

    handleConnection(client: SocketWithUser) {
        console.log(`Client connected to call namespace: ${client.id}`);
    }

    handleDisconnect(client: SocketWithUser) {
        console.log(`Client disconnected from call namespace: ${client.id}`);

        // Clean up any active calls this client was in
        this.activeCalls.forEach((participants, callId) => {
            if (participants.has(client.id)) {
                participants.delete(client.id);

                // If user was in a call, notify others
                if (client.data.userId) {
                    this.server.to(callId).emit('participant:disconnected', {
                        userId: client.data.userId,
                    });
                }
            }
        });
    }

    /**
     * User identifies themselves on connection
     */
    @SubscribeMessage('identify')
    handleIdentify(
        @MessageBody() data: { userId: string; username: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        client.data.userId = data.userId;
        client.data.username = data.username;

        // Join a room with their userId for direct messaging
        client.join(data.userId);

        return { success: true };
    }

    /**
     * Initiate a call
     */
    @SubscribeMessage('call:initiate')
    async handleInitiateCall(
        @MessageBody()
        data: {
            recipientIds: string[];
            callType: CallType;
            conversationId?: string;
        },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { recipientIds, callType, conversationId } = data;
            const initiatorId = client.data.userId;

            if (!initiatorId) {
                return { error: 'User not identified' };
            }

            // Create call in database
            const call = await this.callService.initiateCall(
                initiatorId,
                recipientIds,
                callType,
                conversationId,
            );

            // Join call room
            client.join(call.id);
            this.activeCalls.set(call.id, new Set([client.id]));

            // Notify recipients
            recipientIds.forEach((recipientId) => {
                this.server.to(recipientId).emit('call:incoming', {
                    callId: call.id,
                    callType: call.callType,
                    initiator: {
                        userId: call.initiator.id,
                        username: call.initiator.username,
                        avatarUrl: call.initiator.avatarUrl,
                    },
                    conversationId: call.conversationId,
                });
            });

            return {
                success: true,
                call: {
                    callId: call.id,
                    callType: call.callType,
                    participants: call.participants.map((p) => ({
                        userId: p.user.id,
                        username: p.user.username,
                        avatarUrl: p.user.avatarUrl,
                    })),
                },
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Accept a call
     */
    @SubscribeMessage('call:accept')
    async handleAcceptCall(
        @MessageBody() data: { callId: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.acceptCall(callId, userId);

            // Join call room
            client.join(callId);
            if (!this.activeCalls.has(callId)) {
                this.activeCalls.set(callId, new Set());
            }
            this.activeCalls.get(callId).add(client.id);

            // Notify all participants
            this.server.to(callId).emit('call:accepted', {
                callId,
                userId,
                username: client.data.username,
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Reject a call
     */
    @SubscribeMessage('call:reject')
    async handleRejectCall(
        @MessageBody() data: { callId: string; reason?: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId, reason } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.rejectCall(callId, userId, reason);

            // Notify call initiator
            this.server.to(callId).emit('call:rejected', {
                callId,
                userId,
                reason,
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * End a call
     */
    @SubscribeMessage('call:end')
    async handleEndCall(
        @MessageBody() data: { callId: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            const result = await this.callService.endCall(callId, userId);

            // Notify all participants
            this.server.to(callId).emit('call:ended', {
                callId,
                endedBy: userId,
                duration: result.duration,
            });

            // Clean up
            this.activeCalls.delete(callId);

            return { success: true, duration: result.duration };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * WebRTC Signaling: Send offer
     */
    @SubscribeMessage('call:offer')
    handleOffer(
        @MessageBody()
        data: {
            callId: string;
            targetUserId: string;
            offer: RTCSessionDescriptionInit;
        },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        const { callId, targetUserId, offer } = data;
        const userId = client.data.userId;

        console.log(`📤 Forwarding offer from ${userId} to ${targetUserId}`);

        // Forward offer to target user
        this.server.to(targetUserId).emit('call:offer', {
            callId,
            fromUserId: userId,
            offer,
        });

        return { success: true };
    }

    /**
     * WebRTC Signaling: Send answer
     */
    @SubscribeMessage('call:answer')
    handleAnswer(
        @MessageBody()
        data: {
            callId: string;
            targetUserId: string;
            answer: RTCSessionDescriptionInit;
        },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        const { callId, targetUserId, answer } = data;
        const userId = client.data.userId;

        console.log(`📤 Forwarding answer from ${userId} to ${targetUserId}`);

        // Forward answer to target user
        this.server.to(targetUserId).emit('call:answer', {
            callId,
            fromUserId: userId,
            answer,
        });

        return { success: true };
    }

    /**
     * WebRTC Signaling: Exchange ICE candidates
     */
    @SubscribeMessage('call:ice-candidate')
    handleIceCandidate(
        @MessageBody()
        data: {
            callId: string;
            targetUserId: string;
            candidate: RTCIceCandidateInit;
        },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        const { callId, targetUserId, candidate } = data;
        const userId = client.data.userId;

        // Forward ICE candidate to target user
        this.server.to(targetUserId).emit('call:ice-candidate', {
            callId,
            fromUserId: userId,
            candidate,
        });

        return { success: true };
    }

    /**
     * Toggle mute
     */
    @SubscribeMessage('call:toggle-mute')
    async handleToggleMute(
        @MessageBody() data: { callId: string; isMuted: boolean },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId, isMuted } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.toggleMute(callId, userId, isMuted);

            // Notify all participants
            this.server.to(callId).emit('call:participant-muted', {
                callId,
                userId,
                isMuted,
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Toggle video
     */
    @SubscribeMessage('call:toggle-video')
    async handleToggleVideo(
        @MessageBody() data: { callId: string; isVideoOff: boolean },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId, isVideoOff } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.toggleVideo(callId, userId, isVideoOff);

            // Notify all participants
            this.server.to(callId).emit('call:participant-video-toggled', {
                callId,
                userId,
                isVideoOff,
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Join group call
     */
    @SubscribeMessage('group-call:join')
    async handleJoinGroupCall(
        @MessageBody() data: { callId: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.joinGroupCall(callId, userId);

            // Join call room
            client.join(callId);
            if (!this.activeCalls.has(callId)) {
                this.activeCalls.set(callId, new Set());
            }
            this.activeCalls.get(callId).add(client.id);

            // Get current participants
            const call = await this.callService.getCall(callId);

            // Notify all participants
            this.server.to(callId).emit('group-call:participant-joined', {
                callId,
                participant: {
                    userId,
                    username: client.data.username,
                },
                allParticipants: call.participants
                    .filter((p) => p.status === 'JOINED')
                    .map((p) => ({
                        userId: p.user.id,
                        username: p.user.username,
                        avatarUrl: p.user.avatarUrl,
                        isMuted: p.isMuted,
                        isVideoOff: p.isVideoOff,
                    })),
            });

            return { success: true, call };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Leave group call
     */
    @SubscribeMessage('group-call:leave')
    async handleLeaveGroupCall(
        @MessageBody() data: { callId: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.leaveGroupCall(callId, userId);

            // Leave call room
            client.leave(callId);
            this.activeCalls.get(callId)?.delete(client.id);

            // Notify all participants
            this.server.to(callId).emit('group-call:participant-left', {
                callId,
                userId,
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Mark call as missed (timeout)
     */
    @SubscribeMessage('call:missed')
    async handleMissedCall(
        @MessageBody() data: { callId: string },
        @ConnectedSocket() client: SocketWithUser,
    ) {
        try {
            const { callId } = data;
            const userId = client.data.userId;

            if (!userId) {
                return { error: 'User not identified' };
            }

            await this.callService.markCallAsMissed(callId, userId);

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }
}
