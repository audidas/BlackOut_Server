export interface HeartbeatPayload{
    playerCount?:number;
    status?:'idle' | 'playing';
    mapName?:string;
    uptimeSeconds?:number;
}

export interface DedicatedServer{
    serverId:string;
    ip: string;
    port :number;
    status:'idle' | 'playing' | 'dead';
    registeredAt :string;
    lastHeartbeatAt?:string;
    deadAt?:string;
    lastHeartbeatPayload?:HeartbeatPayload;
    currentSessionId?:string;
    playingAt?:string;
}