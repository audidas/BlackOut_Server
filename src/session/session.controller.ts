import { Controller , Get, Post,Delete,Param,Body, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
    constructor(private readonly sessionService: SessionService){}

    @Post()
    create(@Body() createSessionDto :CreateSessionDto){
        return this.sessionService.create(createSessionDto.playerName);
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
    join(@Param('id') id:string, @Body() joinSessionDto:JoinSessionDto){
        return this.sessionService.join(id,joinSessionDto.playerName);
    }

    @Delete(':id')
    remove(@Param('id') id:string){
        return this.sessionService.remove(id);
    }
}
