import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithSession } from './session-fetch';

function createResponse(status: number): Response {
  return new Response(null, { status });
}

describe('fetchWithSession', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('returns first response when authorized', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(createResponse(200));

    const response = await fetchWithSession('/api/test', undefined, {
      loginPath: '/login/manager',
      fetchImpl: fetchMock,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on 401 before redirecting', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createResponse(401))
      .mockResolvedValueOnce(createResponse(200));
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    });

    const response = await fetchWithSession('/api/test', undefined, {
      loginPath: '/login/manager',
      retryDelayMs: 0,
      fetchImpl: fetchMock,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('redirects when retry still returns 401', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createResponse(401))
      .mockResolvedValueOnce(createResponse(401));
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignMock },
    });

    const response = await fetchWithSession('/api/test', undefined, {
      loginPath: '/login/manager',
      retryDelayMs: 0,
      fetchImpl: fetchMock,
    });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(assignMock).toHaveBeenCalledWith('/login/manager');
  });
});
