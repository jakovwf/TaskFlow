import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CreateInviteDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsEmail()
  inviteeEmail!: string;
}
