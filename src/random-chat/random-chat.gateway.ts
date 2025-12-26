
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
    namespace: 'random-chat',
    cors: {
        origin: '*',
    },
})
export class RandomChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Queue of waiting users
    private waitingQueue: Socket[] = [];

    // Map to track active matches: socketId -> partnerSocketId
    private matches: Map<string, string> = new Map();

    // Map to track active connection IDs: socketId -> connectionId
    private activeConnections: Map<string, string> = new Map();

    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
        private prisma: PrismaService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });

            client.data.userId = payload.sub;
            client.data.username = payload.username;

            console.log(`[RandomChat] Connected: ${client.data.username}`);
        } catch (error) {
            console.error('[RandomChat] Connection error:', error.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`[RandomChat] Disconnected: ${client.data.username}`);
        this.cleanupUser(client);
    }

    private cleanupUser(client: Socket) {
        // Remove from waiting queue
        this.waitingQueue = this.waitingQueue.filter(s => s.id !== client.id);

        // Handle active match
        const partnerId = this.matches.get(client.id);
        const connectionId = this.activeConnections.get(client.id);

        // Update DB record if exists
        if (connectionId) {
            this.prisma.randomVideoConnection.update({
                where: { id: connectionId },
                data: { endedAt: new Date() }
            }).catch(e => console.error('[RandomChat] Error updating connection end:', e));

            this.activeConnections.delete(client.id);
            if (partnerId) this.activeConnections.delete(partnerId);
        }

        if (partnerId) {
            this.server.to(partnerId).emit('match-ended', { reason: 'partner_disconnected' });
            this.matches.delete(partnerId);
            this.matches.delete(client.id);
        }
    }

    @SubscribeMessage('find-partner')
    async handleFindPartner(@ConnectedSocket() client: Socket) {
        // Check if already in a match or queue
        if (this.matches.has(client.id)) {
            return;
        }

        // Check if already in queue
        if (this.waitingQueue.find(s => s.id === client.id)) {
            return;
        }

        if (this.waitingQueue.length > 0) {
            // Match found!
            const partner = this.waitingQueue.shift();

            // Double check partner is still connected
            if (!partner || !partner.connected) {
                // Retry if partner stale
                this.handleFindPartner(client);
                return;
            }

            // Link them
            this.matches.set(client.id, partner.id);
            this.matches.set(partner.id, client.id);

            // Create DB Record
            try {
                const connection = await this.prisma.randomVideoConnection.create({
                    data: {
                        user1Id: client.data.userId,
                        user2Id: partner.data.userId,
                    }
                });
                this.activeConnections.set(client.id, connection.id);
                this.activeConnections.set(partner.id, connection.id);
            } catch (error) {
                console.error('[RandomChat] Error creating connection record:', error);
            }

            // Notify match found
            // One is initiator (client), one is receiver (partner)
            client.emit('match-found', {
                role: 'initiator',
                partnerName: partner.data.username || 'Stranger'
            });

            partner.emit('match-found', {
                role: 'receiver',
                partnerName: client.data.username || 'Stranger'
            });

            console.log(`[RandomChat] Matched ${client.data.username} with ${partner.data.username}`);
        } else {
            // No one waiting, add to queue
            this.waitingQueue.push(client);
            client.emit('waiting-for-partner');
            console.log(`[RandomChat] ${client.data.username} joined queue`);
        }
    }

    @SubscribeMessage('leave-pool')
    handleLeavePool(@ConnectedSocket() client: Socket) {
        this.cleanupUser(client);
        client.emit('left-pool');
    }

    @SubscribeMessage('signal-offer')
    handleOffer(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket
    ) {
        const partnerId = this.matches.get(client.id);
        if (partnerId) {
            this.server.to(partnerId).emit('signal-offer', data);
        }
    }

    @SubscribeMessage('signal-answer')
    handleAnswer(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket
    ) {
        const partnerId = this.matches.get(client.id);
        if (partnerId) {
            this.server.to(partnerId).emit('signal-answer', data);
        }
    }

    @SubscribeMessage('signal-ice-candidate')
    handleIceCandidate(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket
    ) {
        const partnerId = this.matches.get(client.id);
        if (partnerId) {
            this.server.to(partnerId).emit('signal-ice-candidate', data);
        }
    }
}
