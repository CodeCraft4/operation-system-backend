import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContentRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  format?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey?: string;
}
