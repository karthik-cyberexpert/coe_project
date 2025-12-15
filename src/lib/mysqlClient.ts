/**
 * MySQL Client Adapter
 * Replaces Supabase client calls with REST API calls
 */

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ==============================================
// TYPE DEFINITIONS
// ==============================================

interface User {
  id: string;
  email: string;
  email_verified: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  is_admin: boolean;
  is_ceo: boolean;
  is_sub_admin: boolean;
  is_staff: boolean;
}

interface Session {
  access_token: string;
  refresh_token: string;
  user: User & { profile: Profile };
}

interface AuthResponse {
  data: Session | null;
  error: Error | null;
}

interface QueryResponse<T> {
  data: T | null;
  error: Error | null;
}

// ==============================================
// TOKEN MANAGEMENT
// ==============================================

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'coe_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'coe_refresh_token';
  private static readonly USER_KEY = 'coe_user';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

// ==============================================
// HTTP CLIENT
// ==============================================

class HttpClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<QueryResponse<T>> {
    const token = TokenManager.getAccessToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle token expiration
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          return this.request(endpoint, options);
        } else {
          TokenManager.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      // Safely parse response body which might be empty or non-JSON
      let parsed: any = null;
      try {
        const text = await response.text();
        if (text && text.length > 0) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text; // fallback to raw text
          }
        }
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const message = (parsed && parsed.error) ? parsed.error : response.statusText || 'Request failed';
        return { data: null, error: new Error(message) };
      }

      return { data: parsed as any, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private static async refreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        TokenManager.setTokens(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async get<T>(endpoint: string): Promise<QueryResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, body: any): Promise<QueryResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async put<T>(endpoint: string, body: any): Promise<QueryResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static async delete<T>(endpoint: string): Promise<QueryResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// ==============================================
// QUERY BUILDER (Supabase-like API)
// ==============================================

class QueryBuilder<T> {
  private endpoint: string;
  private filters: string[] = [];
  private orderByField: string | null = null;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private selectFields: string = '*';

  constructor(table: string) {
    this.endpoint = `/${table}`;
  }

  select(fields: string = '*'): this {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push(`${column}=${encodeURIComponent(value)}`);
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push(`${column}!=${encodeURIComponent(value)}`);
    return this;
  }

  or(filter: string): this {
    this.filters.push(`or=${encodeURIComponent(filter)}`);
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderByField = column;
    this.orderDirection = options.ascending !== false ? 'asc' : 'desc';
    return this;
  }

  async execute(): Promise<QueryResponse<T[]>> {
    let query = this.endpoint;
    const params: string[] = [];
    if (this.filters.length > 0) {
      params.push(...this.filters);
    }
    if (this.orderByField) {
      params.push(`order=${encodeURIComponent(this.orderByField)}`);
      params.push(`dir=${this.orderDirection}`);
    }
    if (params.length > 0) {
      query += '?' + params.join('&');
    }
    return HttpClient.get<T[]>(query);
  }

  // Thenable so that `await query.order(...)` auto-executes
  then<TResult1 = QueryResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected as any);
  }

  // Single row query
  async single(): Promise<QueryResponse<T>> {
    const result = await this.execute();
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: new Error('No rows returned') };
  }

  // Single row query that returns null if no rows found (no error)
  async maybeSingle(): Promise<QueryResponse<T | null>> {
    const result = await this.execute();
    if (result.error) {
      return { data: null, error: result.error };
    }
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: null }; // No error, just no data
  }
}

// ==============================================
// AUTH CLIENT
// ==============================================

const auth = {
  async signUp(credentials: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string } };
  }): Promise<AuthResponse> {
    TokenManager.clearTokens();
    
    const response = await HttpClient.post<{ user: any }>('/auth/signup', {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.options?.data?.full_name,
    });

    if (response.error) {
      return { data: null, error: response.error };
    }

    return { data: null, error: null };
  },

  async signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await HttpClient.post<Session>('/auth/signin', credentials);

    if (response.error) {
      return { data: null, error: response.error };
    }

    if (response.data) {
      TokenManager.setTokens(
        response.data.access_token,
        response.data.refresh_token
      );
      TokenManager.setUser(response.data.user);
    }

    return { data: response.data, error: null };
  },

  async signOut(): Promise<{ error: Error | null }> {
    await HttpClient.post('/auth/signout', {});
    TokenManager.clearTokens();
    return { error: null };
  },

  async getUser(): Promise<{ data: { user: User | null }; error: Error | null }> {
    const cachedUser = TokenManager.getUser();
    if (!cachedUser) {
      return { data: { user: null }, error: null };
    }

    const response = await HttpClient.get<{ user: User }>('/auth/user');
    
    if (response.error) {
      return { data: { user: null }, error: response.error };
    }

    return { data: { user: response.data?.user || null }, error: null };
  },

  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUser();

    if (!token || !user) {
      return { data: { session: null }, error: null };
    }

    return {
      data: {
        session: {
          access_token: token,
          refresh_token: TokenManager.getRefreshToken() || '',
          user,
        },
      },
      error: null,
    };
  },

  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    // Initial check
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUser();

    if (token && user) {
      setTimeout(() => {
        callback('SIGNED_IN', {
          access_token: token,
          refresh_token: TokenManager.getRefreshToken() || '',
          user,
        });
      }, 0);
    } else {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
    }

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'coe_access_token') {
        if (e.newValue) {
          callback('SIGNED_IN', {
            access_token: e.newValue,
            refresh_token: TokenManager.getRefreshToken() || '',
            user: TokenManager.getUser(),
          });
        } else {
          callback('SIGNED_OUT', null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            window.removeEventListener('storage', handleStorageChange);
          },
        },
      },
    };
  },
};

// ==============================================
// TABLE OPERATIONS
// ==============================================

const from = <T = any>(table: string) => {
  return {
    select(columns: string = '*') {
      const builder = new QueryBuilder<T>(table);
      builder.select(columns);
      return builder;
    },

    async insert(data: Partial<T> | Partial<T>[]): Promise<QueryResponse<T | T[]>> {
      const isBulk = Array.isArray(data);
      const endpoint = isBulk ? `/${table}/bulk` : `/${table}`;
      const body = isBulk ? { [table]: data } : data;

      return HttpClient.post<T | T[]>(endpoint, body);
    },

    update(data: Partial<T>) {
      return {
        eq(column: string, value: any): Promise<QueryResponse<T>> {
          // Currently supports eq on primary key (id). `column` is ignored.
          return HttpClient.put<T>(`/${table}/${value}`, data);
        },
      } as const;
    },

    delete() {
      return {
        eq(column: string, value: any): Promise<QueryResponse<void>> {
          return HttpClient.delete<void>(`/${table}/${value}`);
        },
      } as const;
    },
  } as const;
};

// ==============================================
// REALTIME (Simplified - uses polling)
// ==============================================

const channel = (channelName: string) => {
  let intervalId: NodeJS.Timeout | null = null;
  let callbacks: Array<() => void> = [];

  return {
    on(
      event: string,
      filter: { event: string; schema: string; table: string },
      callback: () => void
    ) {
      callbacks.push(callback);
      return this;
    },

    subscribe() {
      // Poll every 30 seconds for changes (reduced from 5s to prevent unnecessary refreshes during scrolling)
      intervalId = setInterval(() => {
        callbacks.forEach(cb => cb());
      }, 30000);

      return this;
    },

    unsubscribe() {
      if (intervalId) {
        clearInterval(intervalId);
      }
      callbacks = [];
    },
  };
};

const removeChannel = (ch: any) => {
  if (ch && ch.unsubscribe) {
    ch.unsubscribe();
  }
};

// ==============================================
// STORAGE CLIENT
// ==============================================

const storage = {
  from(bucket: string) {
    return {
      async download(path: string): Promise<{ data: Blob | null; error: Error | null }> {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            return { data: null, error: new Error('Not authenticated') };
          }

          const response = await fetch(`${API_URL}/storage/download?path=${encodeURIComponent(path)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            return { data: null, error: new Error(errorData.error || 'Download failed') };
          }

          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async upload(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: Error | null }> {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            return { data: null, error: new Error('Not authenticated') };
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', path);

          const response = await fetch(`${API_URL}/storage/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: new Error(data.error || 'Upload failed') };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async update(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: Error | null }> {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            return { data: null, error: new Error('Not authenticated') };
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', path);

          const response = await fetch(`${API_URL}/storage/update`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: new Error(data.error || 'Update failed') };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async remove(paths: string[]): Promise<{ data: any; error: Error | null }> {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            return { data: null, error: new Error('Not authenticated') };
          }

          // Delete files one by one
          const results = [];
          for (const path of paths) {
            const response = await fetch(`${API_URL}/storage/remove?path=${encodeURIComponent(path)}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              return { data: null, error: new Error(errorData.error || 'Delete failed') };
            }

            results.push(await response.json());
          }

          return { data: results, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async list(path: string = '', options?: any): Promise<{ data: any[]; error: Error | null }> {
        try {
          const token = TokenManager.getAccessToken();
          if (!token) {
            return { data: [], error: new Error('Not authenticated') };
          }

          const response = await fetch(`${API_URL}/storage/list?path=${encodeURIComponent(path)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: [], error: new Error(data.error || 'List failed') };
          }

          return { data: data.files || [], error: null };
        } catch (error) {
          return { data: [], error: error as Error };
        }
      },
    };
  },
};

// ==============================================
// EXPORT CLIENT
// ==============================================

export const mysqlClient = {
  auth,
  from,
  channel,
  removeChannel,
  storage,
};

// Default export for easy migration
export default mysqlClient;

