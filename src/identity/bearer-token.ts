export function extractBearerToken(header?: string): string | null {
  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
