import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { isSupabaseConfigured } from '@config/supabase';
import { SplashScreenProps } from 'src/Types/types';

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const checkUser = async () => {
    try {
      if (!isSupabaseConfigured) {
        await AsyncStorage.removeItem('userUuid');
        navigation.replace('SignInScreen');
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      if (session?.user) {
        await AsyncStorage.setItem('userUuid', session.user.id);
        navigation.replace('HomeScreen');
        return;
      }

      await AsyncStorage.removeItem('userUuid');
      navigation.replace('SignInScreen');
    } catch (error) {
      console.error('Error checking user session:', error);
      await AsyncStorage.removeItem('userUuid');
      navigation.replace('SignInScreen');
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F64509" />
    </View>
  );
};

const styles = {
    container: {
        flex: 1,
        justifyContent: 'center' as 'center',
        alignItems: 'center' as 'center',
    },
};

export default SplashScreen;
