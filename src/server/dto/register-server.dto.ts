import { IsIP , IsInt , Min,Max } from "class-validator";

export class RegisterServerDto{

    @IsIP()
    ip!:string;

    @IsInt()
    @Min(1024)
    @Max(65535)
    port!:number;
}