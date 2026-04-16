import { Module } from "@nestjs/common";
import { JwtModule}from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
    imports:[
        JwtModule.register({
            secret:'blackout-jwt-secret-2026', // 환경변수 세팅
            signOptions:{expiresIn:'24h'},
        }),
    ],
    controllers:[AuthController],
    providers:[JwtAuthGuard],
    exports:[JwtModule,JwtAuthGuard]
})
export class AuthModule {}