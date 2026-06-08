import {Module} from "@nestjs/common";
import {MeController} from "./me.controller";
import {SessionModule} from "../session/session.module";
import {AuthModule} from "../auth/auth.module";

@Module({
    imports:[SessionModule , AuthModule],
    controllers:[MeController],
})
export class MeModule {}