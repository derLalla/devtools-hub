import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setAuthToken } from '../api/client';

const STORAGE_KEY = 'devtools.auth';

interface StoredAuth {
  token: string;
  username: string;
}

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const initial = readStored();
  const token = ref<string | null>(initial?.token ?? null);
  const username = ref<string | null>(initial?.username ?? null);

  if (initial?.token) setAuthToken(initial.token);

  const isAuthenticated = computed(() => !!token.value);

  async function login(user: string, password: string): Promise<void> {
    const { data } = await api.post('/auth/login', { username: user, password });
    token.value = data.token;
    username.value = data.user.username;
    setAuthToken(data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, username: data.user.username }));
  }

  function logout(): void {
    token.value = null;
    username.value = null;
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { token, username, isAuthenticated, login, logout };
});
