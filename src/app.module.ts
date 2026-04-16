import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {ThrottlerModule , ThrottlerGuard} from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SessionModule } from './session/session.module';
import { EVentModule } from './events.modules';
import {AuthMoudle} from './auth/auth.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl :60000,
      limit :30,
    }]),
    RedisModule.forRoot({
      type:'single',
      url: 'redis://:blackout2026@localhost:6379'
    }),
    AuthMoudle,
    EVentModule,
    SessionModule
  ],
  controllers: [AppController],
  providers: [AppService,{
    provide:APP_GUARD,
    useClass:ThrottlerGuard
  }],
})
export class AppModule {}
