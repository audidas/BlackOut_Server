import {Type} from "class-transformer";
import{IsArray, IsInt , IsNumber, IsObject , IsOptional, IsString, ValidateNested, ArrayMaxSize} from "class-validator";

export class MovementSampleDto {
@IsString() matchId! :string;
@IsString() accountId! : string;
@IsInt() tSec!:number;
@IsNumber() x!:number;
@IsNumber() y!:number;
@IsNumber() z!:number;
@IsString() levelName!: string;
@IsString() state!:string;
}

export class MatchEventDto {
    @IsString() eventId!: string;
    @IsString() matchId!: string;
    @IsOptional() @IsString() accountId?:string;
    @IsNumber() tSec!:number;
    @IsNumber() x!:number;
    @IsNumber() y!:number;
    @IsNumber() z!:number;
    @IsString() levelName!:string;
    @IsString() eventType!:string;
    @IsOptional() @IsObject() context? : Record<string, unknown>;
}

export class TelemetryBatchDto {
    @IsOptional() @IsArray() @ArrayMaxSize(5000)
    @ValidateNested({each:true}) @Type(()=> MovementSampleDto)
    samples? :MovementSampleDto[];

    @IsOptional() @IsArray() @ArrayMaxSize(5000)
    @ValidateNested({each:true}) @Type(()=> MatchEventDto)
    events?:MatchEventDto[];
}