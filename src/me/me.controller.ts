import {Controller , Get ,UseGuards} from "@nestjs/common";
import {SessionService } from "../session/session.service";
import  {JwtAuthGuard} from "../auth/jwt-auth.guard";
import {CurrentUser} from "../auth/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("me")
export class MeController {
    constructor(private readonly sessionService: SessionService){}

    // 메인 메뉴 진입시 조회 - 진행 중 세션 있으면 {dediIp, port , sessionId } , 없으면 null
    @Get('active-session')
    activeSession(@CurrentUser() playerName: string){
        return this.sessionService.getActiveSession(playerName);
    }
}