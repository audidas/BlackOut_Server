import {IsString , Length ,Matches} from 'class-validator';

export class JoinSessionDto {
    @IsString()
    @Length(2,16)
    @Matches(/^[a-zA-Z0-9_가-힣]+$/ ,{
        message:'playerName은 영문/숫자/언더스코어/한글 만 허용됩니다',
    })
    playerName!: string;
}
