import { IsString } from 'class-validator';

export class AssignCardMemberDto {
  @IsString()
  userId!: string;
}
