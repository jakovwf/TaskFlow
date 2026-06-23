import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
