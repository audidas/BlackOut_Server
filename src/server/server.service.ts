import { Injectable , NotFoundException, ConflictException} from '@nestjs/common';
import {InjectRedis} from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { DedicatedServer } from './server.interfaces';

@Injectable()
export class ServerService {

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
        }

        await this.redis.set(`server:${server.serverId}`,JSON.stringify(server));
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
            if(keys.length >0){
                const values =await this.redis.mget(...keys);
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