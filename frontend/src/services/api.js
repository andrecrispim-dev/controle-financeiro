function resolveApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001/api`;
}

const API_URL = resolveApiUrl();

async function request(path, options = {}) {
  let response;
  try {
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
      ? { ...(options.headers || {}) }
      : { 'Content-Type': 'application/json', ...(options.headers || {}) };
    response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options
    });
  } catch (error) {
    throw new Error(`Nao foi possivel conectar ao backend em ${API_URL}. Verifique se o servidor da API esta iniciado.`);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const details = Array.isArray(body?.errors) && body.errors.length > 0
      ? ` ${body.errors.map((error) => `${error.field}: ${error.message}`).join(' | ')}`
      : '';
    const message = `${body?.message || 'Nao foi possivel concluir a operacao.'}${details}`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data = {}) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  deleteBody: (path, data = {}) => request(path, { method: 'DELETE', body: JSON.stringify(data) }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, headers: {} }),
  csvUrl: (query = '') => `${API_URL}/exportacoes/csv${query}`,
  pdfUrl: (query = '') => `${API_URL}/exportacoes/pdf${query}`,
  backupDownloadUrl: (arquivo) => `${API_URL}/backups/${encodeURIComponent(arquivo)}/download`
};
