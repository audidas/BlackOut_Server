import {Controller , Post , Body, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {

    constructor(private readonly jwtService:JwtService){}

    // Dummy 로그인 (실제로는 DB 조회 시간남으면 ㄱㄱ)
    @Post('login')
    login(@Body() body :{playerName :string; password:string}){
        const {playerName , password} = body;

        if(!playerName || !password){
            throw new UnauthorizedException('PlayerName 과 Password가 필요합니다.');
        }

        if(password !== 'blackout2026'){
            throw new UnauthorizedException('잘못된 비밀번호입니다.');
        }

        const payload = {playerName, sub:playerName};
        const token = this.jwtService.sign(payload);

        return {access_token: token , playerName};
    }
}