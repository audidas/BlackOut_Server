
import { Injectable , Logger, OnModuleInit,OnModuleDestroy } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from 'ioredis';
import { EventsGateWay } from "src/events.gateway";


@Injectable()
export class SessionExpirationListner implements OnModuleInit,OnModuleDestroy{
    private readonly logger = new Logger(SessionExpirationListner.name);

    private subscriber! :Redis;

    constructor(
        @InjectRedis() private readonly redis:Redis,
        private readonly gateway: EventsGateWay,
    ){}

    async onModuleInit() {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('__keyevent@0__:expired');

        this.subscriber.on('message', (channel ,expiredKey)=>{
            if(channel==='__keyevent@0__:expired' && expiredKey.startsWith('session:')){
                const sessionId = expiredKey.slice('session:'.length);
                void this.handleSessionExpired(sessionId);
            }
        });

        this.logger.log("Redis 키 만료 이벤트 구독 시작");
    }

    async onModuleDestroy() {
        await this.subscriber?.quit();
    }

    private async handleSessionExpired(sessionId:string): Promise<void>{

        const playerToClean: string[] = [];
        let cursor ='0';
        do{
            const [nextCursor ,keys] = await this.redis.scan(
                cursor,
                'MATCH',
                'player:*',
                'COUNT',
                100,
            );
            cursor = nextCursor;
            if(keys.length >0){
                const values =await this.redis.mget(...keys);
                keys.forEach((key,i)=>{
                    if(values[i] === sessionId) playerToClean.push(key);
                });
            }
        }while(cursor !=='0')

        if(playerToClean.length >0){
            await this.redis.del(...playerToClean);
            this.logger.log(
                `세션 ${sessionId} 만료 -> 좀비 player 키 ${playerToClean.length}개 정리 : ${playerToClean.join(', ')}`,
            );
        }else {
            this.logger.log(`세션 ${sessionId} 만료 (좀비 player 키 없음)`);
        }

        this.gateway.emitToSession(sessionId,'matchmaking_failed',{
            sessionId,
            reason:'timeout',
            message:'매칭 시간이 초과되었습니다.',
        });
    }
}

