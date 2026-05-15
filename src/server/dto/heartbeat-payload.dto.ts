import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// 데디가 heartbeat 와 함께 보고하는 자기 상태 정보. 매칭 결정 / 모니터링 정보.
// 권위는 매칭서버 측 server.status 가 우선 — 본 payload 는 information only.
export class HeartbeatPayloadDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(64)
    playerCount?: number;

    @IsOptional()
    @IsEnum(['idle', 'playing'])
    status?: 'idle' | 'playing';

    @IsOptional()
    @IsString()
    mapName?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    uptimeSeconds?: number;
}
