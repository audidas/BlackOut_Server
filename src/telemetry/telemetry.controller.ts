import {BadRequestException, Body, Controller, Get, Post, Query, UseGuards} from "@nestjs/common";
import {SkipThrottle} from "@nestjs/throttler";
import {ServerApiKeyGuard} from "../server/server-api-key.guard";
import {TelemetryService} from "./telemetry.service";
import {TelemetryBatchDto} from "./dto/telemetry-batch.dto";

@SkipThrottle()
@UseGuards(ServerApiKeyGuard)
@Controller("telemetry")
export class TelemetryController {

    constructor(private readonly telemetryService: TelemetryService){}

    @Post('batch')
    ingest(@Body() body:TelemetryBatchDto){
        return this.telemetryService.ingestBatch(body);
    }

    @Get('run')
    getRuns(@Query('arena') arena?:string){
        return this.telemetryService.getRuns(arena);

    }

    @Get('samples')
    getSamples(@Query('matchId') matchId:string , @Query('state') state? :string , @Query('accountId') accountId?:string){
        if(!matchId){
            throw new BadRequestException('matchId is required');
        }
        return this.telemetryService.getSamples(matchId , state , accountId);
    }

    @Get('events')
    getEvents(@Query('matchId') matchId: string, @Query('type') type?: string){
          if (!matchId) throw new BadRequestException('matchId is required');
        return this.telemetryService.getEvents(matchId, type);
    }

}