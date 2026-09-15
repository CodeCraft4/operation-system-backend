import { IsString, MinLength } from 'class-validator';

/**
 * Frontend completes Supabase OAuth redirect, then posts the access token here
 * to receive the same session payload shape as password login.
 */
export class SocialOAuthCallbackDto {
  @IsString()
  @MinLength(20)
  accessToken!: string;
}
