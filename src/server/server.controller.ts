import {Controller,Post , Get,Param,Body} from '@nestjs/common';
import { ServerService } from './server.service';

@Controller('servers')
export class ServerController{

    constructor(private readonly serverService:ServerService){}

    @Post('register')
    register(@Body()body: {ip:string; port:number}){
        return this.serverService.register(body.ip , body.port);
    }

    @Get()
    findAll(){
        return this.serverService.findAll();
    }

    @Post(':id/idle')
    markIdle(@Param('id') id :string){
        return this.serverService.markIdle(id);
    }

}