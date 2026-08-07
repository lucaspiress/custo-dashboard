const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!resposta.ok) {
    let detalhe = `Erro ${resposta.status}`
    try {
      const corpo = await resposta.json()
      if (corpo && typeof corpo.detail === 'string') detalhe = corpo.detail
    } catch {
      // corpo não-JSON
    }
    throw new ApiError(resposta.status, detalhe)
  }
  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  blob: async (path: string): Promise<Blob> => {
    const resposta = await fetch(`${BASE}${path}`, { credentials: 'include' })
    if (!resposta.ok) throw new ApiError(resposta.status, `Erro ${resposta.status}`)
    return resposta.blob()
  },
}
