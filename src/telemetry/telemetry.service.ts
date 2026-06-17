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

    // 매치/아레나 목록 (드롭다운용). matchId+levelName 단위 분리 — 분석은 아레나별.
    async getRuns(arena?: string) {
        const grouped = await this.prisma.movementSample.groupBy({
            by: ['matchId', 'levelName'],
            where: arena ? { levelName: arena } : {},
            _count: { _all: true },
            _min: { createdAt: true },
        });
        return grouped
            .map((g) => ({
                matchId: g.matchId,
                levelName: g.levelName,
                startedAt: g._min.createdAt, // 적재(첫 flush) 시각 — 실제 시작의 근사
                sampleCount: g._count._all,
            }))
            .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));
    }

    // raw 샘플 (deck.gl 클라 집계용). select 로 BigInt id 제외 — JSON 직렬화 안전.
    async getSamples(matchId: string,levelName?:string,  state?: string, accountId?: string) {
    return this.prisma.movementSample.findMany({
        where: { matchId, ...(levelName ? { levelName } : {}), ...(state ? { state } : {}), ...(accountId ? { accountId } : {}) },
        select: { accountId: true, tSec: true, x: true, y: true, z: true, state: true },
        orderBy: [{ accountId: 'asc' }, { tSec: 'asc' }],
    });
    }
    // 이벤트 (death/down 등) + context.
    async getEvents(matchId: string, levelName?:string ,eventType?: string) {
    return this.prisma.matchEvent.findMany({
        where: { matchId, ...(levelName ? { levelName } : {}), ...(eventType ? { eventType } : {}) },
        select: { eventType: true, tSec: true, x: true, y: true, z: true, accountId: true, context: true },
        orderBy: { tSec: 'asc' },
    });
    }
}