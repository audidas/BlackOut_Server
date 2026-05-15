import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ServerService } from './server.service';

// alive 키 형식: server:{serverId}:alive
const ALIVE_KEY_PATTERN = /^server:([^:]+):alive$/;

@Injectable()
export class ServerExpirationListener implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ServerExpirationListener.name);

    private subscriber!: Redis;

    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly serverService: ServerService,
    ) {}

    async onModuleInit() {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('__keyevent@0__:expired');

        this.subscriber.on('message', (channel, expiredKey) => {
            if (channel !== '__keyevent@0__:expired') return;
            const match = ALIVE_KEY_PATTERN.exec(expiredKey);
            if (!match) return;

            const serverId = match[1];
            void this.handleServerAliveExpired(serverId);
        });

        this.logger.log({ event: 'subscription_started', channel: '__keyevent@0__:expired', pattern: 'server:*:alive' });
    }

    async onModuleDestroy() {
        await this.subscriber?.quit();
    }

    private async handleServerAliveExpired(serverId: string): Promise<void> {
        // 한 expire 처리 실패가 listener 자체를 죽이지 않도록 격리.
        // 진행 중 매치는 클라 ↔ 데디 직접 통신이라 자체 종료까지 영향 없음.
        // 새 매칭에서는 status='dead' 라 findIdle 이 자동 제외.
        try {
            await this.serverService.markDead(serverId);
        } catch (error) {
            this.logger.error({ event: 'mark_dead_failed', serverId, error: (error as Error).message });
        }
    }
}
