// Authentication Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  profilePhoto?: string;
  profileComplete?: boolean;
  emergencyContacts?: EmergencyContact[];
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Shape of the actual backend JSON response body
interface BackendAuthData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profilePicture?: string;
  };
  token: string;
}

interface BackendAuthResponse {
  success: boolean;
  message?: string;
  data: BackendAuthData;
}

class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'userData';

  private normalizeUser(rawUser: any): User {
    const sourceUser = rawUser?.data && !rawUser.firstName ? rawUser.data : rawUser;

    return {
      id: sourceUser?.id || sourceUser?._id || '',
      firstName: sourceUser?.firstName || '',
      lastName: sourceUser?.lastName || '',
      email: sourceUser?.email || '',
      phoneNumber: sourceUser?.phoneNumber || sourceUser?.phone || '',
      dateOfBirth: sourceUser?.dateOfBirth || undefined,
      gender: sourceUser?.gender || undefined,
      bloodGroup: sourceUser?.bloodGroup || sourceUser?.bloodType || undefined,
      bloodType: sourceUser?.bloodType || sourceUser?.bloodGroup || undefined,
      height: sourceUser?.height,
      weight: sourceUser?.weight,
      profilePhoto: sourceUser?.profilePhoto || sourceUser?.profilePicture,
      profileComplete: sourceUser?.profileComplete,
      emergencyContacts: sourceUser?.emergencyContacts,
      medicalConditions: sourceUser?.medicalConditions,
      allergies: sourceUser?.allergies,
      medications: sourceUser?.medications,
      createdAt: sourceUser?.createdAt || new Date().toISOString(),
      updatedAt: sourceUser?.updatedAt || new Date().toISOString(),
    };
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const response = await api.post<BackendAuthResponse>('/auth/login', credentials, false);

      if (response.success && response.data) {
        const { user: backendUser, token } = response.data.data;
        const initialUser: User = {
          id: backendUser.id,
          firstName: backendUser.firstName,
          lastName: backendUser.lastName,
          email: backendUser.email,
          phoneNumber: backendUser.phone || '',
          profilePhoto: backendUser.profilePicture,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.saveAuthData({ user: initialUser, token });

        const user = await this.getCurrentUserProfile();
        if (user) {
          await this.saveAuthData({ user, token });
          return { success: true, user, token };
        }

        return { success: true, user: initialUser, token };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }

  // Register new user
  async register(data: RegisterData): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      // Backend expects 'phone' not 'phoneNumber'
      const payload = { ...data, phone: data.phoneNumber };
      const response = await api.post<BackendAuthResponse>('/auth/register', payload, false);

      if (response.success && response.data) {
        const { user: backendUser, token } = response.data.data;
        const initialUser: User = {
          id: backendUser.id,
          firstName: backendUser.firstName,
          lastName: backendUser.lastName,
          email: backendUser.email,
          phoneNumber: backendUser.phone || data.phoneNumber,
          profilePhoto: backendUser.profilePicture,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.saveAuthData({ user: initialUser, token });

        const user = await this.getCurrentUserProfile();
        if (user) {
          await this.saveAuthData({ user, token });
          return { success: true, user, token };
        }

        return { success: true, user: initialUser, token };
      }

      return { success: false, error: response.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken }, false);
      
      if (response.success && response.data) {
        await this.saveAuthData(response.data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(this.TOKEN_KEY);
    return !!token;
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Fetch current user profile from backend (includes full profile/medical fields)
  async getCurrentUserProfile(): Promise<User | null> {
    try {
      const response = await api.get<any>('/auth/me');
      if (response.success && response.data) {
        return this.normalizeUser((response.data as any)?.data ?? response.data);
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.put<any>('/users/profile', updates);
      
      if (response.success && response.data) {
        const normalizedUser = this.normalizeUser((response.data as any)?.data ?? response.data);
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(normalizedUser));
        return { success: true, user: normalizedUser };
      }
      
      return { success: false, error: response.error || 'Update failed' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'An error occurred while updating profile' };
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'An error occurred while changing password' };
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post('/auth/forgot-password', { email }, false);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword }, false);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  // Private: Save auth data
  private async saveAuthData(data: { user: User; token: string; refreshToken?: string }): Promise<void> {
    const ops: Promise<void>[] = [
      AsyncStorage.setItem(this.TOKEN_KEY, data.token),
      AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user)),
    ];
    if (data.refreshToken) {
      ops.push(AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken));
    }
    await Promise.all(ops);
  }

  // Private: Clear auth data
  private async clearAuthData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.TOKEN_KEY),
      AsyncStorage.removeItem(this.REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(this.USER_KEY),
    ]);
  }
}

export const authService = new AuthService();
export default authService;
