import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller";
import { ServerService } from "./server.service";
import { ServerApiKeyGuard } from "./server-api-key.guard";
import { ServerExpirationListener } from "./server-expiration.listener";

@Module({
    controllers: [ServerController],
    providers: [ServerService, ServerApiKeyGuard, ServerExpirationListener],
    exports: [ServerService,ServerApiKeyGuard ],
})
export class ServerModule {}