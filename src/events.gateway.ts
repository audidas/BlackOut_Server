import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import {Logger} from '@nestjs/common';
import {Server ,WebSocket} from 'ws';

@WebSocketGateway(3001)
export class EventsGateway implements OnGatewayConnection ,OnGatewayDisconnect{

    @WebSocketServer()
    server!:Server;

    private readonly logger = new Logger(EventsGateway.name);

    private readonly sessionClients = new Map<string , Set<WebSocket>>();

    private readonly clientSession = new WeakMap<WebSocket , string>();

    handleConnection(client:WebSocket) {
        this.logger.log('Client Connected');
        client.send(JSON.stringify({event :'hi' , data:{message :'connect to lobby'}}));
    }

    handleDisconnect(client: WebSocket) {
        this.logger.log('Client disconnected');

        const sessionId = this.clientSession.get(client);
        if(sessionId){
            this.removeClientFromSession(sessionId,client);
        }
    }

    @SubscribeMessage('join_session')
    handleJoinSession(client:WebSocket , data:{sessionId?:string}):void{
        const sessionId= data?.sessionId;
        if (!sessionId || typeof sessionId!== 'string'){
            client.send(

                JSON.stringify({
                    event:'error',
                    data:{message :'sessionId 가 필요 합니다.'},
                }),
            );
            return;
        }

        const previous = this.clientSession.get(client);
        if(previous && previous !== sessionId){
            this.removeClientFromSession(previous, client);
        }

        let room = this.sessionClients.get(sessionId);
        if(!room){
            room = new Set();
            this.sessionClients.set(sessionId,room);
        }

        room.add(client);
        this.clientSession.set(client ,sessionId);

        this.logger.log(`client -> session ${sessionId} 참가 현재 ${room.size}명`);

        client.send(JSON.stringify({
            event:'joined_session',
            data:{sessionId , count:room.size},
        }),
    );
    }

    @SubscribeMessage('leave_session')
    handleLeaveSession(client:WebSocket):void{
        const sessionId = this.clientSession.get(client);
        if(!sessionId) return;

        this.removeClientFromSession(sessionId,client);
        client.send(
            JSON.stringify({
                event:'left_session',
                data:{sessionId},
            })
        )
    }

    @SubscribeMessage('ping')
    handlePing(client:WebSocket , data:any):void{
        client.send(JSON.stringify({event:'pong' , data:{timestamp: new Date().toISOString() }}));
    }


    emitToSession(sessionId :string , event:string , data:unknown):void{
        const room = this.sessionClients.get(sessionId);
        if ( !room || room.size ===0){
            this.logger.warn(`emitToSession(${sessionId}) : 룸 비어있음 (수신자 0명)`);
            return;
        }

        const payload = JSON.stringify({event,data});
        let sent = 0;

        for(const client of room){
            if(client.readyState === WebSocket.OPEN){
                client.send(payload);
                sent++;
            }
        }
        this.logger.log(`emitToSession(${sessionId}, ${event}) -> ${sent}/${room.size} 명 푸시`);
    }


    private removeClientFromSession(sessionId:string , client:WebSocket):void{
        const room = this.sessionClients.get(sessionId);
        if(!room) return;

        room.delete(client);
        this.clientSession.delete(client);

        if(room.size ===0){
            this.sessionClients.delete(sessionId);
        }

        this.logger.log(`client <- session ${sessionId} 퇴장 (현재 ${room.size}명)`)
    }
}