import { ProviderError } from './provider-error';

export async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  provider: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'))
    ) {
      throw ProviderError.timeout(provider, timeoutMs);
    }
    throw new ProviderError({
      code: 'provider_error',
      provider,
      message: `${provider} request failed.`,
      cause: error,
      statusHint: 502,
    });
  } finally {
    clearTimeout(timer);
  }
}
