import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string | null;
}
