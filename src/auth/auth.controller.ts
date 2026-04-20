import {Controller , Post , Body, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {

    constructor(private readonly jwtService:JwtService){}

    // Dummy 로그인 (실제로는 DB 조회 시간남으면 ㄱㄱ)
    @Throttle({default:{limit:5, ttl:60000}})
    @Post('login')
    login(@Body() dto: LoginDto){
        const {playerName , password} = dto;

        if(password !== 'blackout2026'){
            throw new UnauthorizedException('잘못된 비밀번호입니다.');
        }

        const payload = {playerName, sub:playerName};
        const token = this.jwtService.sign(payload);

        return {access_token: token , playerName};
    }
}