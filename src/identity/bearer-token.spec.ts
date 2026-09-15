import { extractBearerToken } from './bearer-token';

describe('extractBearerToken', () => {
  it('reads a bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def');
  });

  it('rejects a missing or malformed header', () => {
    expect(extractBearerToken()).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Basic abc.def')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer token extra')).toBeNull();
  });
});
