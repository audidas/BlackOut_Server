import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {ThrottlerModule , ThrottlerGuard} from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SessionModule } from './session/session.module';
import { EventsModule } from './events.module';
import {AuthModule} from './auth/auth.module';
import { ServerModule } from './server/server.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl :60000,
      limit :30,
    }]),
    RedisModule.forRootAsync({
      imports:[ConfigModule],
      inject:[ConfigService],
      useFactory:(config :ConfigService)=>({
        type:'single',
        url :config.get<string>('REDIS_URL'),
      }),
    }),
    AuthModule,
    EventsModule,
    SessionModule,
    ServerModule,
    MatchmakingModule
  ],
  controllers: [AppController],
  providers: [AppService,{
    provide:APP_GUARD,
    useClass:ThrottlerGuard
  }],
})
export class AppModule {}
