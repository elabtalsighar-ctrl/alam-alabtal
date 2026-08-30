const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = data?.error || 'حدث خطأ، حاول مرة أخرى.';
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // helpers
  settings: () => request<{ [k: string]: string }>('/settings'),
  adminSettings: () => request<{ [k: string]: string }>('/admin/settings'),
  updateSettings: (b: Record<string, string>) => request<{ [k: string]: string }>('/settings', { method: 'PUT', body: JSON.stringify(b) }),
  categories: (all = false) => request<any[]>('/categories' + (all ? '?all=1' : '')),
  products: (qs = '') => request<any[]>(`/products${qs}`),
  product: (slugOrId: number | string) => request<any>(`/products/${slugOrId}`),
  createProduct: (b: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(b) }),
  updateProduct: (id: number, b: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteProduct: (id: number) => request<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  createCategory: (b: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(b) }),
  updateCategory: (id: number, b: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteCategory: (id: number) => request<{ ok: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
  createOrder: (b: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(b) }),
  orders: (status?: string) => request<any[]>(`/orders${status ? `?status=${status}` : ''}`),
  updateOrder: (id: number, status: string) => request<any>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  customers: () => request<any[]>('/customers'),
  createCustomer: (b: { name: string; phone: string; wilaya: string; commune: string; address?: string }) =>
    request<any>('/customers', { method: 'POST', body: JSON.stringify(b) }),
  reviews: (approved?: boolean) => request<any[]>(`/reviews${approved ? '?approved=true' : ''}`),
  createReview: (b: any) => request<any>('/reviews', { method: 'POST', body: JSON.stringify(b) }),
  updateReview: (id: number, b: any) => request<any>(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteReview: (id: number) => request<{ ok: boolean }>(`/reviews/${id}`, { method: 'DELETE' }),
  stats: () => request<any>('/stats'),
  contact: (b: any) => request<{ ok: boolean }>('/contact', { method: 'POST', body: JSON.stringify(b) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; email: string; role: string; name?: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  upload: async (file: File) => {
    const token = localStorage.getItem('admin_token');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'حدث خطأ.');
    return data as { url: string };
  }
};

export function formatPrice(value: number | null | undefined): string {
  const n = Number(value || 0);
  return `${n.toLocaleString('fr-DZ')} دج`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function discountPct(price: number, old: number | null | undefined): number | null {
  if (!old || old <= price || old <= 0) return null;
  return Math.round(((old - price) / old) * 100);
}
