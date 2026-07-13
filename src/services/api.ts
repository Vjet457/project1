// API Service - Base HTTP client for backend communication
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const API_PORT = 5000;

const getDevHost = (): string | null => {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  const hostMatch = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
  return hostMatch?.[1] || null;
};
// Optional debug override: set this if you want to force a specific dev API URL.
// Leave empty so the app can auto-detect the Metro host or fall back to emulator/device targets.
const DEV_API_OVERRIDE =
  (globalThis as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  '';

const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://192.168.2.130:5000/api';
  }

  if (DEV_API_OVERRIDE) {
    return DEV_API_OVERRIDE;
  }

  const detectedHost = getDevHost();

  if (Platform.OS === 'android') {
    if (detectedHost && detectedHost !== 'localhost' && detectedHost !== '127.0.0.1') {
      return `http://${detectedHost}:${API_PORT}/api`;
    }
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://${detectedHost || 'localhost'}:${API_PORT}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const getDevApiBaseCandidates = (): string[] => {
  const candidates: string[] = [];
  const detectedHost = getDevHost();

  if (detectedHost) {
    candidates.push(`http://${detectedHost}:${API_PORT}/api`);
  }

  if (Platform.OS === 'android') {
    candidates.push(
      `http://10.0.2.2:${API_PORT}/api`,
      `http://192.168.2.130:${API_PORT}/api`, // Physical device LAN IP
      `http://localhost:${API_PORT}/api`,
      `http://127.0.0.1:${API_PORT}/api`,
    );
  } else {
    candidates.push(
      `http://192.168.2.130:${API_PORT}/api`, // Physical device LAN IP
      `http://localhost:${API_PORT}/api`
    );
  }

  candidates.push(API_BASE_URL);
  return Array.from(new Set(candidates));
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

class ApiService {
  private baseUrl: string;
  private readonly devBaseCandidates: string[];

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.devBaseCandidates = __DEV__ ? getDevApiBaseCandidates() : [API_BASE_URL];
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch {
      return null;
    }
  }

  async request<T>(endpoint: string, options: RequestOptions): Promise<ApiResponse<T>> {
    const { method, body, headers = {}, requiresAuth = true } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const baseUrls = __DEV__ ? [this.baseUrl, ...this.devBaseCandidates] : [this.baseUrl];
    const uniqueBaseUrls = Array.from(new Set(baseUrls));
    let lastNetworkError: unknown = null;

    for (const baseUrl of uniqueBaseUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          return {
            success: false,
            error: data?.error || data?.message || 'Request failed',
          };
        }

        if (this.baseUrl !== baseUrl) {
          this.baseUrl = baseUrl;
          if (__DEV__) {
            console.log(`API base URL switched to ${baseUrl}`);
          }
        }

        return {
          success: true,
          data,
        };
      } catch (error) {
        lastNetworkError = error;
      }
    }

    console.error('API Error:', lastNetworkError);
    return {
      success: false,
      error: `Network error. Tried: ${uniqueBaseUrls.join(', ')}. Ensure backend is running and reachable on port ${API_PORT}.`,
    };
  }

  // GET request
  async get<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  // POST request
  async post<T>(endpoint: string, body: any, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth });
  }

  // PUT request
  async put<T>(endpoint: string, body: any, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth });
  }

  // PATCH request
  async patch<T>(endpoint: string, body: any, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requiresAuth });
  }

  // DELETE request
  async delete<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }
}

export const api = new ApiService();
export default api;
