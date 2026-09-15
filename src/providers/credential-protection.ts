const SECRET_KEY_PATTERN =
  /(password|secret|token|api[_-]?key|authorization|bearer|credential|smtp[_-]?pass)/i;

const REDACTED = '[REDACTED]';

/**
 * Strip credential-like values before logging or returning errors.
 * Never log raw provider tokens, API keys, or SMTP passwords.
 */
export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      output[key] = SECRET_KEY_PATTERN.test(key)
        ? REDACTED
        : redactValue(nested);
    }
    return output;
  }

  return value;
}

function redactString(value: string) {
  if (/^Bearer\s+\S+/i.test(value)) {
    return 'Bearer [REDACTED]';
  }
  if (value.length >= 24 && /^[A-Za-z0-9._\-+/=]+$/.test(value)) {
    return REDACTED;
  }
  return value;
}

export function assertNoSecretInMessage(message: string, secrets: Array<string | undefined>) {
  for (const secret of secrets) {
    if (secret && message.includes(secret)) {
      throw new Error('Provider message must not include raw credentials.');
    }
  }
}
