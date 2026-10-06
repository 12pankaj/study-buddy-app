import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically detect the host computer IP when running on physical mobile device or emulator
const debuggerHost = Constants.expoConfig?.hostUri;
const detectedIp = debuggerHost ? debuggerHost.split(':')[0] : null;

export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  (detectedIp ? `http://${detectedIp}:3000` : (Platform.OS === 'android' ? 'http://10.155.0.148:3000' : 'http://localhost:3000'));

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Attempt to parse JSON even if error status
    let data;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
};
