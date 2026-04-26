import React, { useState } from 'react';
import { StyleSheet, Text, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useForm } from 'react-hook-form';
import CustomForm from '../Components/Forms/FormInput';
import ScreenHeader from '@components/Layouts/ScreenHeader';
import { FormData, FormField } from '../Types/types';
import supabase from '@config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groceryTheme } from '@src/Utils/groceryTheme';

const SignInScreen = ({ navigation }) => {
  const { control, handleSubmit } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      phone: '',
    }
  });
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('HomeScreen');
  };

  const sendDataToSupabase = async (data: FormData) => {
    setLoading(true);
    try {
      const { email, password, phone } = data;

      if (phone && phone.trim().length > 0 && (!email || email.trim().length === 0)) {
        // Phone-only sign in: send OTP
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        navigation.navigate('VerificationScreen', { phone, flow: 'phone_signin' });
        setLoading(false);
        return;
      }

      // Default: email + password sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userResp = await supabase.auth.getUser();
      const userId = userResp.data.user?.id || '';
      AsyncStorage.setItem('userUuid', userId);
      navigation.replace('HomeScreen');
    } catch (error) {
      Alert.alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formFields: FormField[] = [
    {
      name: 'phone',
      label: 'Phone',
      placeholder: '+91 98765 43210',
      rules: { required: false },
      keyboardType: 'phone-pad',
    },
    {
      name: 'email',
      label: 'Email',
      placeholder: 'Enter your email',
      rules: { 
        required: 'Email is required',
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: 'Invalid email address'
        }
      },
      keyboardType: 'email-address',
    },
    {
      name: 'password',
      label: 'Password',
      placeholder: 'Enter your password',
      rules: { 
        required: 'Password is required',
        minLength: {
          value: 6,
          message: 'Password must be at least 6 characters'
        }
      },
      secureTextEntry: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Sign In" onBack={handleBack} />
          <View style={styles.methodRow}>
            <TouchableOpacity onPress={() => setMethod('email')} style={[styles.methodBtn, method === 'email' && styles.methodBtnActive]}>
              <Text style={[styles.methodText, method === 'email' && styles.methodTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMethod('phone')} style={[styles.methodBtn, method === 'phone' && styles.methodBtnActive]}>
              <Text style={[styles.methodText, method === 'phone' && styles.methodTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formWrap}>
            <CustomForm
              fields={formFields.filter(f => (method === 'email' ? f.name !== 'phone' : f.name === 'phone'))}
              control={control}
              onSubmit={handleSubmit(sendDataToSupabase)}
              submitButtonText={loading ? "Signing in..." : "Sign In"}
              disabled={loading}
            />
            <Text style={styles.smallText}>
              Don't have an account?{' '}
              <Text
                onPress={() => navigation.navigate('SignUpScreen')}
                style={styles.smallTextBlue}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: groceryTheme.colors.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  formWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  smallText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    color: groceryTheme.colors.textSecondary,
  },
  smallTextBlue: {
    color: groceryTheme.colors.brandDark,
    textDecorationLine: 'underline',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: groceryTheme.radius.md,
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: groceryTheme.colors.primary,
  },
  methodText: {
    color: groceryTheme.colors.textSecondary,
    fontSize: 14,
  },
  methodTextActive: {
    color: groceryTheme.colors.onPrimary,
    fontWeight: '700',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: groceryTheme.colors.textPrimary,
  },
  errorText: {
    color: groceryTheme.colors.danger,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SignInScreen;
