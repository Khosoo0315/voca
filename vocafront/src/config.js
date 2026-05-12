import Constants from 'expo-constants';

const fromExpoConfig =
  Constants?.expoConfig?.extra?.API_BASE ||
  Constants?.manifest?.extra?.API_BASE ||
  '';

export const API_BASE = (fromExpoConfig || 'http://localhost:8000').replace(
  /\/+$/,
  '',
);
