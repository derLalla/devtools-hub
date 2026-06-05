import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Clear stored credentials; routing guard will redirect on next nav.
      try {
        localStorage.removeItem('devtools.auth');
      } catch {
        /* ignore */
      }
      setAuthToken(null);
    }
    return Promise.reject(err);
  }
);

export interface LinkDto {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  category?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type LinkInput = Omit<LinkDto, 'id' | 'createdAt' | 'updatedAt'>;

export async function listLinks(): Promise<LinkDto[]> {
  const { data } = await api.get<LinkDto[]>('/links');
  return data;
}

export async function createLink(input: LinkInput): Promise<LinkDto> {
  const { data } = await api.post<LinkDto>('/links', input);
  return data;
}

export async function updateLink(id: string, input: Partial<LinkInput>): Promise<LinkDto> {
  const { data } = await api.put<LinkDto>(`/links/${id}`, input);
  return data;
}

export async function deleteLink(id: string): Promise<void> {
  await api.delete(`/links/${id}`);
}
