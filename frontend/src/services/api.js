const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
  } catch (error) {
    throw new Error(`Nao foi possivel conectar ao backend em ${API_URL}. Verifique se o servidor da API esta iniciado.`);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = body?.message || 'Nao foi possivel concluir a operacao.';
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
  csvUrl: (query = '') => `${API_URL}/exportacoes/csv${query}`,
  backupDownloadUrl: (arquivo) => `${API_URL}/backups/${encodeURIComponent(arquivo)}/download`
};
