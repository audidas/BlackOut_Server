import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate{
    constructor(private readonly jwtService:JwtService){}

    canActivate(context: ExecutionContext):boolean{
        const request = context.switchToHttp().getRequest();
        const authHeadder  =request.headers['authorization'];

        if(!authHeadder || !authHeadder.startsWith('Bearer')){
            throw new UnauthorizedException("토큰이 필요합니다.");
        }

        const token = authHeadder.split(' ')[1];

        try{
            const payload = this.jwtService.verify(token);
            request.user = payload;
            return true;
        }catch{
            throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
        }
    }
}