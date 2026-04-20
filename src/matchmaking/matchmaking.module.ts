import {Module} from '@nestjs/common';
import { MatchmakingContoller } from './matchmaking.controller';
import { SessionModule } from 'src/session/session.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports:[SessionModule,AuthModule],
    controllers :[MatchmakingContoller]
})
export class MatchmakingModule{};