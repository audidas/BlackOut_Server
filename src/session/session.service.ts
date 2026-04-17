import { Injectable , ConflictException , NotFoundException , BadRequestException , ForbiddenException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {v4 as uuidv4} from 'uuid';
import {GameSession} from './session.interfaces';
import { ServerService } from '../server/server.service';

@Injectable()
export class SessionService {

    private static readonly PLAYER_TTL_SECONDS = 3600;
    private static readonly WAITING_TTL_SECONDS = 180;

    constructor(@InjectRedis() private readonly redis:Redis ,
                private readonly serverService:ServerService,
    ){}

    async create(playerName:string) : Promise<GameSession> {

        const sessionId = uuidv4();
        await this.claimPlayer(playerName, sessionId);

        const session : GameSession = {
            sessionId,
            status:'waiting',
            players:[playerName],
            maxPlayers: 4,
            serverIp:'',
            serverPort:0 ,
            createdAt: new Date().toISOString()
        }

        await this.redis.set(
            `session:${session.sessionId}`,
            JSON.stringify(session),
            `EX`,
            SessionService.WAITING_TTL_SECONDS,
        );

        return session;
    }

    async findAll():Promise<GameSession[]>{
        const sessions: GameSession[] = [];
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.redis.scan(
                cursor, 'MATCH', 'session:*', 'COUNT', 100,
            );
            cursor = nextCursor;
            if (keys.length > 0) {
                const values = await this.redis.mget(...keys);
                values.forEach((v) => {
                    if (v) sessions.push(JSON.parse(v) as GameSession);
                });
            }
        } while (cursor !== '0');
        return sessions;
    }

    async findOne(sessionId:string) :Promise<GameSession> {
        const data = await this.redis.get(`session:${sessionId}`);
        if(!data) throw new NotFoundException('세션을 찾을 수 없습니다');
        return JSON.parse(data) as GameSession;
    }

    async join(sessionId:string , playerName:string):Promise<GameSession>{
        const session = await this.findOne(sessionId);  // 없으면 findOne이 404 throw
        if(session.status !== 'waiting')
            throw new BadRequestException(`대기 상태가 아닌 세션에는 입장할수 없습니다`);
        if(session.players.length >= session.maxPlayers)
            throw new BadRequestException('정원이 초과되었습니다');


        await this.claimPlayer(playerName , sessionId);

        session.players.push(playerName);

        if(session.players.length >= session.maxPlayers){
            session.status ='playing';
        }

        const serialized = JSON.stringify(session);
        if(session.status === 'playing'){
            const server = await this.serverService.findIdle();
            if(!server){
                // 롤백: 방금 claim한 player 키 제거 (좀비 방지)
                await this.redis.del(`player:${playerName}`);
                throw new BadRequestException('배정 가능한 서버가 없습니다.');
            }
            session.serverIp =server.ip;
            session.serverPort =server.port;
            await this.serverService.markPlaying(server.serverId);
            await this.redis.set(`session:${sessionId}`, JSON.stringify(session));
        }else{
            await this.redis.set(`session:${sessionId}`,serialized,'KEEPTTL');
        }

        return session
    }

    async remove(sessionId:string, requester:string) :Promise<boolean>{
        const session = await this.findOne(sessionId);  // 없으면 404

        // 상태별 권한 분기
        // - waiting : 생성자만 취소 가능 (매칭 취소 용도)
        // - playing : 데디 서버만 종료 가능 (차후 /finish 엔드포인트에서 처리)
        if(session.status === 'waiting'){
            if(session.players[0] !== requester){
                throw new ForbiddenException('세션 생성자만 취소할 수 있습니다');
            }
        } else if(session.status === 'playing'){
            throw new ForbiddenException(
                '진행 중인 게임은 데디 서버만 종료할 수 있습니다',
            );
        }

        // 여기 도달 시 status는 'waiting' 또는 'finished'
        // playing 상태의 서버 정리는 추후 /sessions/:id/finish 에서 담당
        if(session.players.length > 0){
            const playerKeys = session.players.map((name)=> `player:${name}`);
            await this.redis.del(...playerKeys);
        }

        const result = await this.redis.del(`session:${sessionId}`);
        return result > 0;
    }

    // 1 플레이어 = 1 세션
    private async claimPlayer(playerName :string , sessionId:string):Promise<void>{
        const result = await this.redis.set(
            `player:${playerName}`,
            sessionId,
            'EX',
            SessionService.PLAYER_TTL_SECONDS,
            'NX',
        );
        if(result=== null){
            throw new ConflictException(
                `플레이어 ${playerName}은(는) 이미 다른 세션에 참가 중입니다.`
            );
        }
    }

}
