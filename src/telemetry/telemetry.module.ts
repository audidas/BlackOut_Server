import {Module} from "@nestjs/common";
import {ServerModule} from "../server/server.module";
import {TelemetryController} from "./telemetry.controller";
import {TelemetryService} from "./telemetry.service";

@Module({
    imports:[ServerModule],
    controllers:[TelemetryController],
    providers:[TelemetryService],
})
export class TelemetryModule {}