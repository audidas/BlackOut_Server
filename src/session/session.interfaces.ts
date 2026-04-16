export interface GameSession{

    sessionId: string;
    status: 'waiting' | 'playing' | 'finished';
    players: string[];
    maxPlayers :number;
    serverIp:string;
    serverPort: number;
    createdAt:string;
}