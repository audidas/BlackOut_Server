import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ServerService } from './server.service';
import { ServerApiKeyGuard } from './server-api-key.guard';
import { RegisterServerDto } from './dto/register-server.dto';

@Controller('servers')
export class ServerController {

    constructor(private readonly serverService: ServerService) {}

    @UseGuards(ServerApiKeyGuard)
    @Post('register')
    register(@Body() body:RegisterServerDto) {
        return this.serverService.register(body.ip, body.port);
    }

    // 서버 목록 조회는 디버그/관리 용도 — 보호 없이 유지 (R&D 단계)
    @Get()
    findAll() {
        return this.serverService.findAll();
    }

    @UseGuards(ServerApiKeyGuard)
    @Post(':id/idle')
    markIdle(@Param('id') id: string) {
        return this.serverService.markIdle(id);
    }
}