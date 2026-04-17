import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {ThrottlerModule , ThrottlerGuard} from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SessionModule } from './session/session.module';
import { EventsModule } from './events.module';
import {AuthModule} from './auth/auth.module';
import { ServerModule } from './server/server.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl :60000,
      limit :30,
    }]),
    RedisModule.forRoot({
      type:'single',
      url: 'redis://:blackout2026@localhost:6379'
    }),
    AuthModule,
    EventsModule,
    SessionModule,
    ServerModule,
  ],
  controllers: [AppController],
  providers: [AppService,{
    provide:APP_GUARD,
    useClass:ThrottlerGuard
  }],
})
export class AppModule {}
