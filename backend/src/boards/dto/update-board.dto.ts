import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  backgroundUrl?: string | null;

  @IsOptional()
  @IsIn(['blue', 'purple', 'green', 'orange', 'slate'])
  backgroundColor?: string | null;
}
