import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SystemMetrics {
    timestamp: string;
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
    };
    network: {
        connections: number;
    };
}

class SystemMonitor {
    private metrics: SystemMetrics[] = [];
    private intervalId?: NodeJS.Timeout;

    async start(intervalMs: number = 1000) {
        console.log('🔍 Starting System Monitor...\n');

        this.intervalId = setInterval(async () => {
            const metrics = await this.collectMetrics();
            this.metrics.push(metrics);
            this.displayMetrics(metrics);
        }, intervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.displaySummary();
    }

    private async collectMetrics(): Promise<SystemMetrics> {
        const cpuUsage = await this.getCPUUsage();
        const memoryInfo = this.getMemoryInfo();
        const connections = await this.getActiveConnections();

        return {
            timestamp: new Date().toISOString(),
            cpu: {
                usage: cpuUsage,
                cores: os.cpus().length,
            },
            memory: memoryInfo,
            network: {
                connections,
            },
        };
    }

    private async getCPUUsage(): Promise<number> {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        });

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~(100 * idle / total);

        return usage;
    }

    private getMemoryInfo() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usagePercent = (used / total) * 100;

        return {
            total: this.bytesToGB(total),
            used: this.bytesToGB(used),
            free: this.bytesToGB(free),
            usagePercent: parseFloat(usagePercent.toFixed(2)),
        };
    }

    private async getActiveConnections(): Promise<number> {
        try {
            // Windows command
            if (process.platform === 'win32') {
                const { stdout } = await execAsync('netstat -an | find "3000" | find "ESTABLISHED" /c');
                return parseInt(stdout.trim()) || 0;
            }
            // Linux/Mac command
            else {
                const { stdout } = await execAsync('netstat -an | grep 3000 | grep ESTABLISHED | wc -l');
                return parseInt(stdout.trim()) || 0;
            }
        } catch (error) {
            return 0;
        }
    }

    private bytesToGB(bytes: number): number {
        return parseFloat((bytes / 1024 / 1024 / 1024).toFixed(2));
    }

    private displayMetrics(metrics: SystemMetrics) {
        process.stdout.write('\r\x1b[K'); // Clear line
        process.stdout.write(
            `📊 CPU: ${metrics.cpu.usage}% | ` +
            `💾 Memory: ${metrics.memory.used}GB/${metrics.memory.total}GB (${metrics.memory.usagePercent}%) | ` +
            `🔌 Connections: ${metrics.network.connections} | ` +
            `⏰ ${new Date().toLocaleTimeString()}`
        );
    }

    private displaySummary() {
        if (this.metrics.length === 0) {
            console.log('\n⚠️  No metrics collected');
            return;
        }

        const avgCPU = this.metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / this.metrics.length;
        const maxCPU = Math.max(...this.metrics.map(m => m.cpu.usage));
        const avgMemory = this.metrics.reduce((sum, m) => sum + m.memory.usagePercent, 0) / this.metrics.length;
        const maxMemory = Math.max(...this.metrics.map(m => m.memory.usagePercent));
        const maxConnections = Math.max(...this.metrics.map(m => m.network.connections));

        console.log('\n\n' + '='.repeat(60));
        console.log('📊 SYSTEM MONITORING SUMMARY');
        console.log('='.repeat(60));
        console.log(`
🖥️  CPU Usage:
   - Average: ${avgCPU.toFixed(2)}%
   - Peak: ${maxCPU.toFixed(2)}%
   - Cores: ${this.metrics[0].cpu.cores}

💾 Memory Usage:
   - Average: ${avgMemory.toFixed(2)}%
   - Peak: ${maxMemory.toFixed(2)}%
   - Total RAM: ${this.metrics[0].memory.total}GB

🔌 Network:
   - Max Concurrent Connections: ${maxConnections}

⏱️  Monitoring Duration: ${this.metrics.length} seconds

💡 System Health:
   ${this.getHealthAssessment(avgCPU, maxCPU, avgMemory, maxMemory)}
    `);
        console.log('='.repeat(60) + '\n');
    }

    private getHealthAssessment(avgCPU: number, maxCPU: number, avgMemory: number, maxMemory: number): string {
        let assessment = '';

        // CPU Assessment
        if (maxCPU < 50) {
            assessment += '✅ CPU: Healthy - System has plenty of headroom\n   ';
        } else if (maxCPU < 80) {
            assessment += '⚠️  CPU: Moderate - Consider optimization\n   ';
        } else {
            assessment += '❌ CPU: Critical - System is overloaded\n   ';
        }

        // Memory Assessment
        if (maxMemory < 60) {
            assessment += '✅ Memory: Healthy - Good memory availability\n   ';
        } else if (maxMemory < 85) {
            assessment += '⚠️  Memory: Moderate - Monitor for memory leaks\n   ';
        } else {
            assessment += '❌ Memory: Critical - Risk of out-of-memory errors\n   ';
        }

        // Overall recommendation
        if (maxCPU < 50 && maxMemory < 60) {
            assessment += '✅ Overall: System can handle more load';
        } else if (maxCPU < 80 && maxMemory < 85) {
            assessment += '⚠️  Overall: Near capacity - optimization recommended';
        } else {
            assessment += '❌ Overall: At capacity - immediate action required';
        }

        return assessment;
    }
}

// Run monitor
const monitor = new SystemMonitor();
monitor.start(1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitor...');
    monitor.stop();
    process.exit(0);
});

console.log('Press Ctrl+C to stop monitoring\n');
