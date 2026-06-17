import { Injectable , ConflictException , NotFoundException , BadRequestException, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {v4 as uuidv4} from 'uuid';
import {GameSession} from './session.interfaces';
import { ServerService, MATCH_KEY_TTL_SECONDS } from '../server/server.service';
import { EventsGateway } from '../events.gateway';

@Injectable()
export class SessionService {

    private static readonly PLAYER_TTL_SECONDS = MATCH_KEY_TTL_SECONDS;
    private static readonly WAITING_TTL_SECONDS = 180;
    private static readonly PLAYING_TTL_SECONDS = MATCH_KEY_TTL_SECONDS;
     private readonly logger = new Logger(SessionService.name);

    constructor(@InjectRedis() private readonly redis:Redis ,
                private readonly serverService:ServerService,
                private readonly gateway: EventsGateway,

    ){}

    async create(playerName:string) : Promise<GameSession> {

        const sessionId = uuidv4();
        await this.claimPlayer(playerName, sessionId);

        const session : GameSession = {
            sessionId,
            status:'waiting',
            players:[playerName],
            maxPlayers: Number(process.env.SESSION_MAX_PLAYERS) || 4, // 미설정 시 기본 4
            serverId:'',
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

    async findOpenSession() : Promise<GameSession | null>{
        const all = await this.findAll();
        const open = all.filter(
            (s) => s.status ==='waiting' && s.players.length < s.maxPlayers
        );

        open.sort((a,b)=>b.players.length - a.players.length);
        return open[0] ?? null;
    }

    async join(sessionId:string , playerName:string):Promise<GameSession>{
        const session = await this.findOne(sessionId);

        // 이미 참가한 플레이어는 현제 세션 반환
        if(session.players.includes(playerName)){
            return session;
        }

        if(session.status !== 'waiting')
            throw new BadRequestException(`대기 상태가 아닌 세션에는 입장할수 없습니다`);
        if(session.players.length >= session.maxPlayers)
            throw new BadRequestException('정원이 초과되었습니다');

        await this.claimPlayer(playerName , sessionId);
        session.players.push(playerName);

        const transitioningToPlaying = session.players.length >= session.maxPlayers;
        if(transitioningToPlaying){
            session.status = 'playing';

            const server = await this.serverService.findIdle();
            if(!server){
                await this.redis.del(`player:${playerName}`);
                throw new BadRequestException('배정 가능한 서버가 없습니다.');
            }
            session.serverId = server.serverId;
            session.serverIp = server.ip;
            session.serverPort = server.port;
            await this.serverService.markPlaying(server.serverId , sessionId);

            // playing 전환 시 안전망 TTL — 정상 흐름은 /finish 가 처리, 데디 crash 등 이상 시 자동 정리
            await this.redis.set(`session:${sessionId}`, JSON.stringify(session) ,'EX' , SessionService.PLAYING_TTL_SECONDS);
        } else {
            // waiting 상태 업데이트 — 기존 TTL 유지 (방 생성 후 3분 타이머 리셋 방지)
            await this.redis.set(`session:${sessionId}`, JSON.stringify(session), 'KEEPTTL');
        }

        // 세션 룸 전체에 "누군가 참가함" 알림 (현재 인원 포함)
        this.gateway.emitToSession(sessionId, 'player_joined', {
            sessionId,
            players: session.players,
            count: session.players.length,
        });

        // 매치 성사 (4명 차서 playing 전환됨) → 서버 IP 공유
        if(transitioningToPlaying){
            this.gateway.emitToSession(sessionId, 'game_start', {
                sessionId,
                serverIp: session.serverIp,
                serverPort: session.serverPort,
            });
        }

        return session;
    }

    async autoMatch(playerName:string): Promise<{session:GameSession; isNewRoom :boolean}>{

        for(let attemp = 0; attemp <2; attemp++){
            const open = await this.findOpenSession();

            if(!open){
                const session = await this.create(playerName);
                return {session , isNewRoom :true};
            }

            try {
                const session = await this.join(open.sessionId , playerName);
                return {session , isNewRoom :false};
            }catch(e){
                if( e instanceof ConflictException) throw e;
                if (attemp ===1) throw e;
            }
        }
        throw new Error('메치메이킹 실패');
    }

    async leave(playerName: string) : Promise<{sessionDestroyed:boolean}>{
        const sessionId =await this.redis.get(`player:${playerName}`);

        if(!sessionId){
            throw new NotFoundException('참가중인 세션이 없습니다');
        }
        const session = await this.findOne(sessionId);

        session.players = session.players.filter((n)=> n!==playerName);
        await this.redis.del(`player:${playerName}`);

        if(session.players.length===0){

            if (session.status ==='playing' && session.serverId){
                await this.serverService.markIdle(session.serverId);
            }
            await this.redis.del(`session:${sessionId}`);
            this.gateway.closeRoom(sessionId);
            return {sessionDestroyed:true};
        }

        await this.redis.set(
            `session:${sessionId}`,
            JSON.stringify(session),
            'KEEPTTL',
        );
        this.gateway.emitToSession(sessionId,'player_left',{
            sessionId,
            playerName,
            players:session.players,
            count :session.players.length,
        });
        return {sessionDestroyed:false};
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

    async finish(sessionId:string) :Promise<{ok:boolean; serverId:string}> {
        let session: GameSession | null = null;
           try {
        session = await this.findOne(sessionId);
    } catch(e) {
        if(!(e instanceof NotFoundException)) throw e;
        // 세션이 이미 만료/삭제 — 멱등 종료. 역링크로 server 찾아 markIdle 시도
        const servers = await this.serverService.findAll();
        const owner = servers.find((s) => s.currentSessionId === sessionId);
        if(owner){
            await this.serverService.markIdle(owner.serverId);
            this.logger.log({event:'finish_idempotent_recovered', sessionId, serverId:owner.serverId});
        }
        this.gateway.closeRoom(sessionId);
        return {ok:true, serverId: owner?.serverId ?? ''};
    }

    if(session.status !== 'playing'){
        throw new BadRequestException(`세션 상태가 playing 이 아닙니다 (현재: ${session.status})`);
    }

    if(session.serverId){
        await this.serverService.markIdle(session.serverId);
    }

    if(session.players.length > 0){
        const playerKeys = session.players.map((name) => `player:${name}`);
        await this.redis.del(...playerKeys);
    }

    await this.redis.del(`session:${sessionId}`);

    this.gateway.emitToSession(sessionId, 'session_finished', {sessionId});
    this.gateway.closeRoom(sessionId);

    return {ok:true, serverId:session.serverId};
    }

    // 재접속용 - playerName 의 진행중 세션이 있으면 데디 주소 반환 없으면 null
    async getActiveSession(playerName:string):Promise<{dediIp:string;port:number; sessionId:string} |null>{
        const sessionId = await this.redis.get(`player:${playerName}`);
        if(!sessionId){
            return null;
        }

        let session:GameSession;
        try{
            session = await this.findOne(sessionId);
        }catch{
            // player 키만 남고 세션 소실 -> 재접속 불가
            return null;
        }

        // playing + 데디 배정된 경우만 재접속 대상 (waiting 은 데디 미배정)
        if(session.status !== 'playing' || !session.serverIp){
            return null;
        }

        return {dediIp:session.serverIp , port:session.serverPort , sessionId};
    }


}
