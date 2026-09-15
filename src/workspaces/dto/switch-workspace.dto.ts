import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}
