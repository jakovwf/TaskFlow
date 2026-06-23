import { IsString } from 'class-validator';

export class AddCardLabelDto {
  @IsString()
  labelId!: string;
}
