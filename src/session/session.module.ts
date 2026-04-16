import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { EventsModule } from '../events.module';
import { SessionExpirationListener } from './session-expiration.listener';

@Module({
  imports:[EventsModule],
  controllers: [SessionController],
  providers: [SessionService, SessionExpirationListener],
  exports:[SessionService],
})
export class SessionModule {}
