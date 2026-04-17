import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller";
import { ServerService } from "./server.service";
import { ServerApiKeyGuard } from "./server-api-key.guard";

@Module({
    controllers: [ServerController],
    providers: [ServerService, ServerApiKeyGuard],
    exports: [ServerService],
})
export class ServerModule {}