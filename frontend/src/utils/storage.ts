import * as SecureStore from 'expo-secure-store';

const USER_SESSION_KEY = 'studybuddy_user_session';

export const saveSession = async (user: any) => {
  try {
    await SecureStore.setItemAsync(USER_SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

export const getSession = async () => {
  try {
    const session = await SecureStore.getItemAsync(USER_SESSION_KEY);
    if (session) {
      return JSON.parse(session);
    }
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const clearSession = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_SESSION_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};
