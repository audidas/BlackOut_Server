import {Body , Controller , Post, UseGuards} from "@nestjs/common";
import {SkipThrottle} from "@nestjs/throttler";
import {ServerApiKeyGuard} from "../server/server-api-key.guard";
import {TelemetryService} from "./telemetry.service";
import {TelemetryBatchDto} from "./dto/telemetry-batch.dto";

@Controller("telemetry")
export class TelemetryController {

    constructor(private readonly telemetryService: TelemetryService){}

    @SkipThrottle()
    @UseGuards(ServerApiKeyGuard)
    @Post('batch')
    ingest(@Body() body:TelemetryBatchDto){
        return this.telemetryService.ingestBatch(body);
    }

}