export interface DedicatedServer{
    serverId:string;
    ip: string;
    port :number;
    status:'idle' | 'playing';
    registeredAt :string;
}