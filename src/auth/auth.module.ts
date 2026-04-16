import { Module } from "@nestjs/common";
import { JwtModule}from "@nestjs/jwt";
import { AuthController } from "./auth.controller";

@Module({
    imports:[
        JwtModule.register({
            secret:'blackout-jwt-secret-2026', // 환경변수 세팅
            signOptions:{expiresIn:'24h'},
        }),
    ],
    controllers:[AuthController],
    exports:[JwtModule]
})
export class AuthModule {}