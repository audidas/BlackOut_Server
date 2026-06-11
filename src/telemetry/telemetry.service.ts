import {Injectable ,Logger} from "@nestjs/common";
import {Prisma} from "@prisma/client";
import { PrismaService} from "../prisma/prisma.service";
import {TelemetryBatchDto} from "./dto/telemetry-batch.dto";

@Injectable()
export class TelemetryService {

    private readonly logger = new Logger(TelemetryService.name);

    constructor(private readonly prisma:PrismaService){}

    // 배치 저장
    async ingestBatch(batch:TelemetryBatchDto): Promise<{samples:number; events:number}>{
        const samples = batch.samples ?? [];
        const events  = batch.events ?? [];

        const [sampleRes , eventRes] = await Promise.all([
            samples.length ? this.prisma.movementSample.createMany({data:samples, skipDuplicates :true}) : Promise.resolve({count:0}),
            events.length ? this.prisma.matchEvent.createMany({
                data: events as Prisma.MatchEventCreateManyInput[],skipDuplicates:true,}) : Promise.resolve({count:0}),
            ]);

        this.logger.debug({

            event: 'telemetry_ingest',
            samplesIn: samples.length , samplesInserted:sampleRes.count,
            eventsIn: events.length , eventsInserted:eventRes.count,
        });

        return {samples:sampleRes.count , events:eventRes.count};
        }


}