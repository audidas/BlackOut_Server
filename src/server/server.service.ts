import { Injectable , NotFoundException, ConflictException, Logger} from '@nestjs/common';
import {InjectRedis} from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { DedicatedServer, HeartbeatPayload } from './server.interfaces';

// Heartbeat TTL — 30초 주기 × 3회 누락 허용
const HEARTBEAT_TTL_SECONDS = 90;

@Injectable()
export class ServerService {

    private readonly logger = new Logger(ServerService.name);

    constructor(@InjectRedis() private readonly redis:Redis){}

    async register(ip:string , port:number) :Promise<DedicatedServer>{

        const existing = await this.findByAddress(ip,port);
        if(existing){
            throw new  ConflictException(`${ip}:${port}는 이미 등록된 서버입니다.`);
        }

        const server: DedicatedServer={
            serverId:uuidv4(),
            ip,
            port,
            status:'idle',
            registeredAt:new Date().toISOString(),
            lastHeartbeatAt:new Date().toISOString(),
        }

        await this.redis.set(`server:${server.serverId}`,JSON.stringify(server));
        // 첫 alive 키 — 데디가 자동 heartbeat 시작하기 전 grace period 확보.
        await this.redis.set(`server:${server.serverId}:alive`,'ok','EX',HEARTBEAT_TTL_SECONDS);
        return server;
    }

    // Heartbeat — alive 키 TTL refresh + 메타데이터 timestamp + payload 갱신.
    // payload 는 information only — server.status 의 권위는 markIdle / markPlaying.
    async touchAlive(serverId:string, payload?:HeartbeatPayload):Promise<DedicatedServer>{
        const server = await this.findOne(serverId);
        const wasDead = server.status === 'dead';

        server.lastHeartbeatAt = new Date().toISOString();
        if(payload){
            server.lastHeartbeatPayload = payload;
        }

        // dead 상태에서 hb 가 들어오면 idle 로 복귀 (재등록 효과)
        if(wasDead){
            server.status = 'idle';
            server.deadAt = undefined;
            this.logger.log({event:'server_revived', serverId, ip:server.ip, port:server.port});
        }

        await this.redis.set(`server:${serverId}`,JSON.stringify(server));
        await this.redis.set(`server:${serverId}:alive`,'ok','EX',HEARTBEAT_TTL_SECONDS);

        this.logger.debug({event:'heartbeat', serverId, status:server.status, payload});
        return server;
    }

    // alive TTL expire 시 호출 — server-expiration.listener 가 트리거.
    async markDead(serverId:string):Promise<DedicatedServer | null>{
        const data = await this.redis.get(`server:${serverId}`);
        if(!data){
            this.logger.warn({event:'mark_dead_skipped', serverId, reason:'metadata_not_found'});
            return null;
        }
        const server = JSON.parse(data) as DedicatedServer;
        if(server.status === 'dead'){
            return server;
        }
        const previousStatus = server.status;
        server.status = 'dead';
        server.deadAt = new Date().toISOString();
        await this.redis.set(`server:${serverId}`,JSON.stringify(server));
        this.logger.warn({event:'server_dead', serverId, ip:server.ip, port:server.port, previousStatus, deadAt:server.deadAt});
        return server;
    }

    async findAll():Promise<DedicatedServer[]>{
        const servers :DedicatedServer[] = [];
        let cursor = '0';

        do{
            const [nextCursor , keys] =await this.redis.scan(
                cursor,'MATCH','server:*', 'COUNT',100,
            );
            cursor =nextCursor;
            // alive TTL 키(server:{id}:alive) 는 메타데이터 키와 같은 prefix 라 SCAN 결과 같이 잡힘. 메타데이터 키만 필터.
            const metaKeys = keys.filter((k)=> !k.endsWith(':alive'));
            if(metaKeys.length >0){
                const values =await this.redis.mget(...metaKeys);
                values.forEach((v)=>{
                    if(v) servers.push(JSON.parse(v) as DedicatedServer);
            });
            }
        }while(cursor!='0');
        return servers;
    }

    async findIdle():Promise<DedicatedServer |null >{
        const servers = await this.findAll();
        return servers.find((s)=> s.status==='idle') ?? null;
    }

    async markPlaying(serverId:string):Promise<DedicatedServer>{
        const server = await this.findOne(serverId);
        server.status = 'playing';
        await this.redis.set(`server:${serverId}`,JSON.stringify(server));
        return server;
    }

    async markIdle(serverId:string) :Promise<DedicatedServer>{
        const server= await this.findOne(serverId);
        server.status = 'idle';
        await this.redis.set(`server:${serverId}`,JSON.stringify(server));
        return server;
    }

    async findOne(serverId:string):Promise<DedicatedServer>{
        const data =await this.redis.get(`server:${serverId}`);
        if(!data) throw new NotFoundException('등록되지 않은 서버입니다.');
        return JSON.parse(data) as DedicatedServer;
    }

    private async findByAddress(ip:string , port:number): Promise<DedicatedServer | null>{
        const servers = await this.findAll();
        return servers.find((s)=>s.ip===ip && s.port ===port) ??null;
    }
}