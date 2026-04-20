import { Controller , Post ,Delete, UseGuards } from "@nestjs/common";
import { SessionService } from "src/session/session.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller('matchmaking')
export class MatchmakingContoller {
    constructor(private readonly sessionService :SessionService){}

    @Post('start')
    start(@CurrentUser() playerName:string){
        return this.sessionService.autoMatch(playerName);
    }

    @Delete()
    leave(@CurrentUser() playerName:string){
        return this.sessionService.leave(playerName);
    }
}