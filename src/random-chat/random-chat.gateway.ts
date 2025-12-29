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
import { Logger } from '@nestjs/common';

// ============================================
// PRODUCTION-OPTIMIZED RANDOM CHAT GATEWAY V2
// High Traffic Load + ICE Batching + Reliability
// ============================================

interface ConnectionMetrics {
    connectedAt: number;
    lastHeartbeat: number;
    messageCount: number;
    heartbeatCount: number; // Track heartbeat frequency
    quality: 'excellent' | 'good' | 'poor';
}

interface IceCandidateBatch {
    candidates: RTCIceCandidateInit[];
    timeout: NodeJS.Timeout;
}

@WebSocketGateway({
    namespace: 'random-chat',
    cors: {
        origin: '*',
        credentials: true
    },
    transports: ['websocket', 'polling'],
    // Optimize for high traffic
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    connectTimeout: 45000,
})
export class RandomChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RandomChatGateway.name);

    // Memory-efficient data structures
    private waitingQueue: Set<Socket> = new Set();
    private matches: Map<string, string> = new Map();

    // Rate limiting: userId -> last action timestamp
    private rateLimitMap: Map<string, number> = new Map();
    private readonly RATE_LIMIT_MS = 1000; // 1 second between actions

    // Connection health tracking
    private connectionMetrics: Map<string, ConnectionMetrics> = new Map();

    // ICE candidate batching for optimization
    private iceCandidateBatches: Map<string, IceCandidateBatch> = new Map();
    private readonly ICE_BATCH_DELAY = 50; // 50ms batching window

    // Heartbeat interval
    private heartbeatInterval: NodeJS.Timeout;
    private readonly HEARTBEAT_CHECK_INTERVAL = 30000; // 30 seconds
    private readonly STALE_CONNECTION_TIMEOUT = 90000; // 90 seconds

    constructor(
        private jwtService: JwtService
    ) {
        // Start heartbeat checker
        this.startHeartbeatMonitor();
    }

    // ============================================
    // HEARTBEAT & HEALTH MONITORING
    // ============================================

    private startHeartbeatMonitor() {
        this.heartbeatInterval = setInterval(() => {
            this.cleanupStaleConnections();
            this.logMetrics();
        }, this.HEARTBEAT_CHECK_INTERVAL);
    }

    private cleanupStaleConnections() {
        const now = Date.now();
        const staleClients: string[] = [];

        this.connectionMetrics.forEach((metrics, socketId) => {
            if (now - metrics.lastHeartbeat > this.STALE_CONNECTION_TIMEOUT) {
                staleClients.push(socketId);
            }
        });

        staleClients.forEach(socketId => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
                this.logger.warn(`Disconnecting stale connection: ${socket.data.username}`);
                socket.disconnect(true);
            }
            this.connectionMetrics.delete(socketId);
        });

        if (staleClients.length > 0) {
            this.logger.log(`Cleaned up ${staleClients.length} stale connections`);
        }
    }

    private logMetrics() {
        this.logger.log(`[Metrics] Active: ${this.connectionMetrics.size} | Queue: ${this.waitingQueue.size} | Matches: ${this.matches.size / 2}`);
    }

    // ============================================
    // CONNECTION LIFECYCLE
    // ============================================

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                this.logger.warn('Connection rejected: No token');
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });

            client.data.userId = payload.sub;
            client.data.username = payload.username;

            // Initialize connection metrics
            this.connectionMetrics.set(client.id, {
                connectedAt: Date.now(),
                lastHeartbeat: Date.now(),
                messageCount: 0,
                heartbeatCount: 0,
                quality: 'excellent',
            });

            // Send initial connection quality
            client.emit('connection-quality', { quality: 'excellent' });

            this.logger.log(`✅ Connected: ${client.data.username} (${client.id})`);
        } catch (error) {
            this.logger.error('Connection error:', error.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`❌ Disconnected: ${client.data.username}`);
        this.cleanupUser(client);
        this.connectionMetrics.delete(client.id);
        this.rateLimitMap.delete(client.data.userId);
        this.cleanupIceBatch(client.id); // Clean up any pending ICE batches
    }

    // ============================================
    // RATE LIMITING
    // ============================================

    private isRateLimited(userId: string): boolean {
        const lastAction = this.rateLimitMap.get(userId);
        const now = Date.now();

        if (lastAction && now - lastAction < this.RATE_LIMIT_MS) {
            return true;
        }

        this.rateLimitMap.set(userId, now);
        return false;
    }

    // ============================================
    // USER CLEANUP
    // ============================================

    private cleanupUser(client: Socket) {
        // O(1) removal from queue
        this.waitingQueue.delete(client);

        const partnerId = this.matches.get(client.id);

        if (partnerId) {
            // Notify partner immediately with reason
            this.server.to(partnerId).emit('match-ended', {
                reason: 'partner_disconnected',
                timestamp: Date.now()
            });
            this.matches.delete(partnerId);
        }

        this.matches.delete(client.id);
    }

    // ============================================
    // HEARTBEAT HANDLER
    // ============================================

    @SubscribeMessage('heartbeat')
    handleHeartbeat(@ConnectedSocket() client: Socket) {
        const metrics = this.connectionMetrics.get(client.id);
        if (metrics) {
            const now = Date.now();
            metrics.lastHeartbeat = now;
            metrics.heartbeatCount++;

            // Improved quality calculation based on heartbeat frequency
            const timeSinceConnect = now - metrics.connectedAt;
            const expectedHeartbeats = Math.floor(timeSinceConnect / 10000); // Every 10s
            const heartbeatRatio = expectedHeartbeats > 0 ? metrics.heartbeatCount / expectedHeartbeats : 1;

            // Calculate quality based on both heartbeat ratio and message activity
            if (heartbeatRatio >= 0.9 && metrics.messageCount > 0) {
                metrics.quality = 'excellent';
            } else if (heartbeatRatio >= 0.6 || metrics.messageCount > expectedHeartbeats * 0.3) {
                metrics.quality = 'good';
            } else {
                metrics.quality = 'poor';
            }

            // Send acknowledgment with latency info
            client.emit('heartbeat-ack', {
                quality: metrics.quality,
                timestamp: now
            });
        }
    }

    // ============================================
    // PARTNER MATCHING
    // ============================================

    @SubscribeMessage('find-partner')
    handleFindPartner(@ConnectedSocket() client: Socket) {
        // Rate limiting check
        if (this.isRateLimited(client.data.userId)) {
            client.emit('rate-limited', {
                message: 'Please wait before searching again',
                retryAfter: this.RATE_LIMIT_MS
            });
            return;
        }

        // O(1) checks using Set and Map
        if (this.matches.has(client.id)) {
            client.emit('error', { message: 'Already in a match' });
            return;
        }

        if (this.waitingQueue.has(client)) {
            client.emit('error', { message: 'Already in queue' });
            return;
        }

        if (this.waitingQueue.size > 0) {
            // Get first user from Set (FIFO order preserved)
            const partner = this.waitingQueue.values().next().value;
            this.waitingQueue.delete(partner);

            // Double check partner connection status
            if (!partner || !partner.connected) {
                this.logger.warn('Partner connection stale, retrying match');
                this.handleFindPartner(client);
                return;
            }

            // Link them in memory
            this.matches.set(client.id, partner.id);
            this.matches.set(partner.id, client.id);

            // Emit match found events immediately (No DB delay)
            client.emit('match-found', {
                role: 'initiator',
                partnerName: partner.data.username || 'Stranger',
                timestamp: Date.now()
            });

            partner.emit('match-found', {
                role: 'receiver',
                partnerName: client.data.username || 'Stranger',
                timestamp: Date.now()
            });

            this.logger.log(`🔗 Matched: ${client.data.username} ↔ ${partner.data.username}`);
        } else {
            // Add to waiting queue
            this.waitingQueue.add(client);
            client.emit('waiting-for-partner', {
                queuePosition: this.waitingQueue.size,
                timestamp: Date.now()
            });
            this.logger.log(`⏳ Queue: ${client.data.username} (Position: ${this.waitingQueue.size})`);
        }
    }

    @SubscribeMessage('leave-pool')
    handleLeavePool(@ConnectedSocket() client: Socket) {
        this.cleanupUser(client);
        client.emit('left-pool', { timestamp: Date.now() });
        this.logger.log(`👋 Left pool: ${client.data.username}`);
    }

    // ============================================
    // WEBRTC SIGNALING - OPTIMIZED
    // Direct forwarding with minimal overhead
    // ============================================

    @SubscribeMessage('signal-offer')
    handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        const partnerId = this.matches.get(client.id);
        if (partnerId) {
            this.server.to(partnerId).emit('signal-offer', data);
            this.incrementMessageCount(client.id);
            // Send acknowledgment for reliability
            client.emit('signal-offer-ack');
        }
    }

    @SubscribeMessage('signal-answer')
    handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        const partnerId = this.matches.get(client.id);
        if (partnerId) {
            this.server.to(partnerId).emit('signal-answer', data);
            this.incrementMessageCount(client.id);
            // Send acknowledgment for reliability
            client.emit('signal-answer-ack');
        }
    }

    @SubscribeMessage('signal-ice-candidate')
    handleIceCandidate(@MessageBody() data: { candidate: RTCIceCandidateInit }, @ConnectedSocket() client: Socket) {
        const partnerId = this.matches.get(client.id);
        if (!partnerId) return;

        // Batch ICE candidates to reduce signaling overhead
        let batch = this.iceCandidateBatches.get(client.id);

        if (!batch) {
            batch = {
                candidates: [],
                timeout: setTimeout(() => {
                    this.flushIceBatch(client.id, partnerId);
                }, this.ICE_BATCH_DELAY)
            };
            this.iceCandidateBatches.set(client.id, batch);
        }

        batch.candidates.push(data.candidate);

        // If batch is large enough, flush immediately
        if (batch.candidates.length >= 5) {
            clearTimeout(batch.timeout);
            this.flushIceBatch(client.id, partnerId);
        }
    }

    // ============================================
    // CONNECTION QUALITY REPORTING
    // ============================================

    @SubscribeMessage('report-quality')
    handleQualityReport(@MessageBody() data: { quality: string }, @ConnectedSocket() client: Socket) {
        const metrics = this.connectionMetrics.get(client.id);
        if (metrics && data.quality) {
            metrics.quality = data.quality as any;

            // Notify partner about quality issues
            const partnerId = this.matches.get(client.id);
            if (partnerId && data.quality === 'poor') {
                this.server.to(partnerId).emit('partner-quality-poor', {
                    message: 'Your partner is experiencing connection issues'
                });
            }
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private incrementMessageCount(socketId: string) {
        const metrics = this.connectionMetrics.get(socketId);
        if (metrics) {
            metrics.messageCount++;
        }
    }

    // ============================================
    // ICE CANDIDATE BATCHING
    // ============================================

    private flushIceBatch(socketId: string, partnerId: string) {
        const batch = this.iceCandidateBatches.get(socketId);
        if (!batch || batch.candidates.length === 0) return;

        // Send all candidates at once
        this.server.to(partnerId).emit('signal-ice-candidates-batch', {
            candidates: batch.candidates
        });

        this.incrementMessageCount(socketId);
        this.iceCandidateBatches.delete(socketId);
    }

    private cleanupIceBatch(socketId: string) {
        const batch = this.iceCandidateBatches.get(socketId);
        if (batch) {
            clearTimeout(batch.timeout);
            this.iceCandidateBatches.delete(socketId);
        }
    }

    // Cleanup on module destroy
    onModuleDestroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Clean up all ICE batches
        this.iceCandidateBatches.forEach(batch => clearTimeout(batch.timeout));
        this.iceCandidateBatches.clear();

        this.logger.log('Gateway shutting down gracefully');
    }
}
