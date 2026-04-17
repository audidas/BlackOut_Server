import { Controller , Get, Post,Delete,Param, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
    constructor(private readonly sessionService: SessionService){}

    @Post()
    create(@CurrentUser() playerName: string){
        return this.sessionService.create(playerName);
    }

    @Get()
    findAll(){
        return this.sessionService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id:string){
        return this.sessionService.findOne(id);
    }

    @Post(':id/join')
    join(@Param('id') id:string, @CurrentUser() playerName: string){
        return this.sessionService.join(id, playerName);
    }

    @Delete(':id')
    remove(@Param('id') id:string, @CurrentUser() playerName: string){
        return this.sessionService.remove(id, playerName);
    }
}
