export type IntegrationStatus = 'ok' | 'skipped' | 'error';

export function isUsableSecret(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return (
    !normalized.includes('your_password') &&
    !normalized.includes('your-password') &&
    !normalized.includes('[your-password]') &&
    !normalized.includes('changeme')
  );
}

export function isUsableDatabaseUrl(value?: string) {
  return Boolean(value?.startsWith('postgres') && isUsableSecret(value));
}
