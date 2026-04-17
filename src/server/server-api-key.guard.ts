import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 데디 서버 전용 API 키 Guard.
 * x-server-api-key 헤더가 환경변수 SERVER_API_KEY와 일치해야 통과.
 * 플레이어 JWT와 별개 — 데디 서버가 직접 호출하는 엔드포인트용.
 */
@Injectable()
export class ServerApiKeyGuard implements CanActivate {
    constructor(private readonly config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-server-api-key'];
        const expectedKey = this.config.get<string>('SERVER_API_KEY');

        if (!expectedKey) {
            // 서버 설정이 없으면 모두 거부 (보안 우선)
            throw new UnauthorizedException('서버 API 키가 설정되지 않았습니다');
        }

        if (!providedKey || providedKey !== expectedKey) {
            throw new UnauthorizedException('유효하지 않은 서버 API 키입니다');
        }

        return true;
    }
}
