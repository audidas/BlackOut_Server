import { Controller , Get, Post,Delete,Param, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
    constructor(private readonly sessionService: SessionService){}

    @Get()
    findAll(){
        return this.sessionService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id:string){
        return this.sessionService.findOne(id);
    }

}
