import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class ReorderCardItemDto {
  @IsString()
  id!: string;

  @IsString()
  listId!: string;

  @IsNumber()
  position!: number;
}

export class ReorderCardsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderCardItemDto)
  items!: ReorderCardItemDto[];
}
