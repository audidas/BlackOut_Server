import { Controller , Get, Post,Delete,Param, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServerApiKeyGuard } from '../server/server-api-key.guard';


@Controller('sessions')
export class SessionController {
    constructor(private readonly sessionService: SessionService){}

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(){
        return this.sessionService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id:string){
        return this.sessionService.findOne(id);
    }

    //데디 서버가 게임 종료 보고 , ServerApiKey 인증
    @UseGuards(ServerApiKeyGuard)
    @Post(':id/finish')
    finish(@Param('id') id:string){
        return this.sessionService.finish(id);
    }

}
