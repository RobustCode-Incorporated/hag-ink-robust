type SessionFetchOptions = {
  loginPath: string;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redirectTo(path: string): void {
  if (typeof window !== 'undefined') {
    window.location.assign(path);
  }
}

export async function fetchWithSession(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: SessionFetchOptions,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials ?? 'include',
    cache: init?.cache ?? 'no-store',
  };

  const firstResponse = await fetchImpl(input, requestInit);
  if (firstResponse.status !== 401) return firstResponse;

  await sleep(options.retryDelayMs ?? 200);
  const secondResponse = await fetchImpl(input, requestInit);
  if (secondResponse.status === 401) {
    redirectTo(options.loginPath);
  }

  return secondResponse;
}
