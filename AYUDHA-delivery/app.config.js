import 'dotenv/config';

export default {
  expo: {
    name: 'AYUDHA Delivery',
    slug: 'ayudha-delivery',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#fff8f6'
    },
    ios: {
      supportsTablet: false
    },
    android: {
      package: 'com.ayudha.delivery',
      adaptiveIcon: {
        backgroundColor: '#F64509'
      }
    },
    web: {
      bundler: 'metro'
    },
    plugins: ['expo-font'],
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY
    }
  }
};
