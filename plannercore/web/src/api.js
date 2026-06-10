export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event('planner:logout'));
    throw new ApiError('Sitzung abgelaufen', 401);
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(data?.error || 'Unbekannter Fehler', res.status);
  return data;
}
