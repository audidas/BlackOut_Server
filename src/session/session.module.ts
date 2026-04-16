import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { EVentModule } from 'src/events.modules';
import { SessionExpirationListner } from './session-expiration.listener';

@Module({
  imports:[EVentModule],
  controllers: [SessionController],
  providers: [SessionService, SessionExpirationListner],
  exports:[SessionService],
})
export class SessionModule {}
