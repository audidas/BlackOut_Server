import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * JwtAuthGuard가 request.user에 주입한 JWT payload에서
 * playerName을 꺼내주는 커스텀 데코레이터.
 *
 * 사용:
 *   create(@CurrentUser() playerName: string) { ... }
 */
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.playerName;
    },
);
