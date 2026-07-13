import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wearableService } from '../services/healthConnectService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileComplete?: boolean;
  age?: number;
  weight?: number; // in kg
  height?: number; // in cm
  bmi?: number;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  bloodGroup?: string;
  bloodType?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoggedIn(true);
        
        // Set user profile in wearable service for BMI calculation
        if (parsedUser.weight || parsedUser.height) {
          wearableService.setUserProfile({
            weight: parsedUser.weight,
            height: parsedUser.height,
          });
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsLoggedIn(true);
      
      // Set user profile in wearable service for BMI calculation
      if (userData.weight || userData.height) {
        wearableService.setUserProfile({
          weight: userData.weight,
          height: userData.height,
        });
      }
    } catch (error) {
      console.error('Login storage error:', error);
      throw error;
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const updatedUser = { ...user, ...updates } as User;
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (updates.weight || updates.height) {
        wearableService.setUserProfile({
          weight: updatedUser.weight,
          height: updatedUser.height,
        });
      }
    } catch (error) {
      console.error('updateUser error:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData', 'refreshToken', 'healthConnectConnected', 'mentalHealthCompleted']);
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout, checkAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
