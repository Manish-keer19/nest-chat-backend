import { io, Socket } from 'socket.io-client';

interface TestConfig {
    serverUrl: string;
    totalUsers: number;
    messagesPerUser: number;
    messageInterval: number; // milliseconds
    rampUpTime: number; // milliseconds between user connections
}

interface TestMetrics {
    connectedUsers: number;
    failedConnections: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    startTime: number;
    latencies: number[];
}

class ChatLoadTest {
    private sockets: Socket[] = [];
    private metrics: TestMetrics = {
        connectedUsers: 0,
        failedConnections: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        startTime: Date.now(),
        latencies: [],
    };

    constructor(private config: TestConfig) { }

    async run() {
        console.log('🚀 Starting Load Test...');
        console.log(`📊 Configuration:
    - Server: ${this.config.serverUrl}
    - Total Users: ${this.config.totalUsers}
    - Messages per User: ${this.config.messagesPerUser}
    - Message Interval: ${this.config.messageInterval}ms
    - Ramp-up Time: ${this.config.rampUpTime}ms
    `);

        // Start metrics display
        this.startMetricsDisplay();

        // Create test conversation
        const testConversationId = 'load-test-conversation-' + Date.now();

        // Connect users gradually
        for (let i = 0; i < this.config.totalUsers; i++) {
            this.connectUser(i, testConversationId);

            // Wait before connecting next user (ramp-up)
            if (i < this.config.totalUsers - 1) {
                await this.sleep(this.config.rampUpTime);
            }
        }

        console.log(`\n✅ All ${this.config.totalUsers} users connection attempts completed`);
        console.log('⏳ Waiting for messages to complete...\n');

        // Wait for all messages to be sent
        const totalTestTime = this.config.messagesPerUser * this.config.messageInterval + 5000;
        await this.sleep(totalTestTime);

        // Display final results
        this.displayFinalResults();

        // Cleanup
        this.cleanup();
    }

    private connectUser(userId: number, conversationId: string) {
        const socket = io(this.config.serverUrl, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 10000,
        });

        const userIdStr = `load-test-user-${userId}`;
        let messageCount = 0;

        socket.on('connect', () => {
            this.metrics.connectedUsers++;

            // Join conversation
            socket.emit('join-conversation', conversationId);

            // Start sending messages
            const interval = setInterval(() => {
                if (messageCount >= this.config.messagesPerUser) {
                    clearInterval(interval);
                    return;
                }

                const sendTime = Date.now();
                const messageText = `Test message ${messageCount} from user ${userId}`;

                socket.emit('send-message', {
                    conversationId,
                    senderId: userIdStr,
                    text: messageText,
                });

                this.metrics.messagesSent++;
                messageCount++;

                // Track latency (simplified - measures round trip)
                const latencyTimeout = setTimeout(() => {
                    this.metrics.latencies.push(Date.now() - sendTime);
                }, 100);

            }, this.config.messageInterval);
        });

        socket.on('message', (data) => {
            this.metrics.messagesReceived++;
        });

        socket.on('connect_error', (error) => {
            this.metrics.failedConnections++;
            this.metrics.errors++;
            console.error(`❌ User ${userId} connection error:`, error.message);
        });

        socket.on('error', (error) => {
            this.metrics.errors++;
            console.error(`❌ User ${userId} error:`, error);
        });

        socket.on('disconnect', (reason) => {
            if (reason !== 'io client disconnect') {
                console.warn(`⚠️  User ${userId} disconnected: ${reason}`);
            }
        });

        this.sockets.push(socket);
    }

    private startMetricsDisplay() {
        setInterval(() => {
            const elapsed = ((Date.now() - this.metrics.startTime) / 1000).toFixed(1);
            const avgLatency = this.metrics.latencies.length > 0
                ? (this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length).toFixed(2)
                : '0';

            process.stdout.write('\r\x1b[K'); // Clear line
            process.stdout.write(
                `📊 Connected: ${this.metrics.connectedUsers}/${this.config.totalUsers} | ` +
                `Failed: ${this.metrics.failedConnections} | ` +
                `Sent: ${this.metrics.messagesSent} | ` +
                `Received: ${this.metrics.messagesReceived} | ` +
                `Errors: ${this.metrics.errors} | ` +
                `Avg Latency: ${avgLatency}ms | ` +
                `Time: ${elapsed}s`
            );
        }, 500);
    }

    private displayFinalResults() {
        const totalTime = (Date.now() - this.metrics.startTime) / 1000;
        const avgLatency = this.metrics.latencies.length > 0
            ? (this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length).toFixed(2)
            : '0';
        const maxLatency = this.metrics.latencies.length > 0
            ? Math.max(...this.metrics.latencies).toFixed(2)
            : '0';
        const minLatency = this.metrics.latencies.length > 0
            ? Math.min(...this.metrics.latencies).toFixed(2)
            : '0';
        const messagesPerSecond = (this.metrics.messagesSent / totalTime).toFixed(2);
        const successRate = ((this.metrics.connectedUsers / this.config.totalUsers) * 100).toFixed(2);

        console.log('\n\n' + '='.repeat(60));
        console.log('📊 LOAD TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`
🔌 Connection Stats:
   - Total Users Attempted: ${this.config.totalUsers}
   - Successfully Connected: ${this.metrics.connectedUsers}
   - Failed Connections: ${this.metrics.failedConnections}
   - Success Rate: ${successRate}%

📨 Message Stats:
   - Messages Sent: ${this.metrics.messagesSent}
   - Messages Received: ${this.metrics.messagesReceived}
   - Messages/Second: ${messagesPerSecond}
   - Total Errors: ${this.metrics.errors}

⏱️  Performance:
   - Total Test Time: ${totalTime.toFixed(2)}s
   - Average Latency: ${avgLatency}ms
   - Min Latency: ${minLatency}ms
   - Max Latency: ${maxLatency}ms

💡 Interpretation:
   ${this.getInterpretation(successRate, avgLatency, messagesPerSecond)}
    `);
        console.log('='.repeat(60) + '\n');
    }

    private getInterpretation(successRate: string, avgLatency: string, msgPerSec: string): string {
        const rate = parseFloat(successRate);
        const latency = parseFloat(avgLatency);
        const throughput = parseFloat(msgPerSec);

        let interpretation = '';

        if (rate >= 95) {
            interpretation += '✅ Excellent connection stability\n   ';
        } else if (rate >= 80) {
            interpretation += '⚠️  Moderate connection issues detected\n   ';
        } else {
            interpretation += '❌ Severe connection problems - system overloaded\n   ';
        }

        if (latency < 100) {
            interpretation += '✅ Great response times\n   ';
        } else if (latency < 500) {
            interpretation += '⚠️  Acceptable latency but could be improved\n   ';
        } else {
            interpretation += '❌ High latency - performance degradation\n   ';
        }

        if (throughput > 50) {
            interpretation += '✅ Good message throughput';
        } else if (throughput > 20) {
            interpretation += '⚠️  Moderate throughput';
        } else {
            interpretation += '❌ Low throughput - bottleneck detected';
        }

        return interpretation;
    }

    private cleanup() {
        console.log('🧹 Cleaning up connections...');
        this.sockets.forEach(socket => socket.disconnect());
        process.exit(0);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== TEST SCENARIOS ====================

// Scenario 1: Light Load (Baseline)
const lightLoad: TestConfig = {
    serverUrl: 'http://localhost:3000',
    totalUsers: 50,
    messagesPerUser: 5,
    messageInterval: 2000, // 2 seconds between messages
    rampUpTime: 100, // 100ms between user connections
};

// Scenario 2: Moderate Load
const moderateLoad: TestConfig = {
    serverUrl: 'http://localhost:3000',
    totalUsers: 200,
    messagesPerUser: 10,
    messageInterval: 1000,
    rampUpTime: 50,
};

// Scenario 3: Heavy Load
const heavyLoad: TestConfig = {
    serverUrl: 'http://localhost:3000',
    totalUsers: 500,
    messagesPerUser: 20,
    messageInterval: 500,
    rampUpTime: 20,
};

// Scenario 4: Stress Test (Find Breaking Point)
const stressTest: TestConfig = {
    serverUrl: 'http://localhost:3000',
    totalUsers: 1000,
    messagesPerUser: 30,
    messageInterval: 200,
    rampUpTime: 10,
};

// ==================== RUN TEST ====================

// Get scenario from command line argument
const scenario = process.argv[2] || 'light';

let config: TestConfig;
switch (scenario) {
    case 'light':
        config = lightLoad;
        break;
    case 'moderate':
        config = moderateLoad;
        break;
    case 'heavy':
        config = heavyLoad;
        break;
    case 'stress':
        config = stressTest;
        break;
    default:
        console.error('❌ Invalid scenario. Use: light, moderate, heavy, or stress');
        process.exit(1);
}

console.log(`\n🎯 Running ${scenario.toUpperCase()} load test scenario\n`);

const test = new ChatLoadTest(config);
test.run().catch(console.error);
