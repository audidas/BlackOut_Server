import { Injectable , ConflictException , NotFoundException , BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {v4 as uuidv4} from 'uuid';
import {GameSession} from './session.interfaces';

@Injectable()
export class SessionService {

    private static readonly PLAYER_TTL_SECONDS = 3600;
    private static readonly WAITING_TTL_SECONDS = 180;

    constructor(@InjectRedis() private readonly redis:Redis){}

    async create(playerName:string) : Promise<GameSession> {

        const sessionId = uuidv4();
        await this.claimPlayer(playerName, sessionId);

        const session : GameSession = {
            sessionId,
            status:'waiting',
            players:[playerName],
            maxPlayers: 4,
            serverIp:'127.0.0.1',
            serverPort:7777 ,
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

    async findOne(sessionId:string) :Promise<GameSession |null> {
        const data =await this.redis.get(`session:${sessionId}`);
        return data ? JSON.parse(data) : null;
    }

    async join(sessionId:string , playerName:string):Promise<GameSession | null>{
        const session = await this.findOne(sessionId);
        if(!session) throw new NotFoundException(`세션을 찾을 수 없습니다`);
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
            await this.redis.set(`session:${sessionId}`,serialized);
        }else{
            await this.redis.set(`session:${sessionId}`,serialized,'KEEPTTL');
        }

        return session
    }

    async remove(sessionId:string) :Promise<boolean>{
        const session = await this.findOne(sessionId);

        if( session && session.players.length >0){
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
