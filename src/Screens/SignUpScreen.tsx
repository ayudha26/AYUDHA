import React, { useState } from 'react';
import { StyleSheet, Text, SafeAreaView, Alert, View, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { FormData } from '../Types/types';
import supabase from '@config/supabase';
import { callEmailVerifyFunction } from '@hooks/callEmailVerifyFunction';
import { groceryTheme } from '@src/Utils/groceryTheme';
import ScreenHeader from '@components/Layouts/ScreenHeader';

const SignUpScreen = ({ navigation }) => {
  const { control, handleSubmit } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      userName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('HomeScreen');
  };

  const handleFormSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.userName,
            phone: data.phone,
          },
        },
      });

      if (error) throw error;

      await callEmailVerifyFunction(data.email, (verificationCode) => {
        navigation.navigate('VerificationScreen', {
          email: data.email,
          password: data.password,
          verificationCode,
          userName: data.userName,
          phone: data.phone,
        });
      });
    } catch (error) {
      Alert.alert('Error sending verification email', error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <ScreenHeader title="Sign Up" onBack={handleBack} />

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Enter your details to start sourcing professional equipment.
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>USER NAME</Text>
            <Controller
              control={control}
              name="userName"
              rules={{ required: 'User name is required' }}
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter your name"
                    placeholderTextColor="#A9A9A9"
                    autoCapitalize="words"
                  />
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <Controller
              control={control}
              name="phone"
              rules={{ required: 'Phone number is required' }}
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#A9A9A9"
                    keyboardType="phone-pad"
                  />
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' },
              }}
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="partner@company.com"
                    placeholderTextColor="#A9A9A9"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>PASSWORD</Text>
            <Controller
              control={control}
              name="password"
              rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="••••••••"
                    placeholderTextColor="#A9A9A9"
                    secureTextEntry
                  />
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit(handleFormSubmit)}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>{loading ? 'PROCESSING...' : 'SIGN UP'}</Text>
          </TouchableOpacity>

          <Text style={styles.footerPrompt}>
            Already have an account?{' '}
            <Text onPress={() => navigation.navigate('SignInScreen')} style={styles.footerLink}>
              Sign In
            </Text>
          </Text>

          <Text style={styles.bottomBranding}>
            © 2024 AYUDHA INDUSTRIAL SUPPLIES. ALL RIGHTS RESERVED.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  headerBlock: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    ...groceryTheme.typography.displayLg,
    fontSize: 28,
    color: '#1A1C1C',
    marginBottom: 8,
  },
  subtitle: {
    ...groceryTheme.typography.body,
    color: groceryTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  label: {
    ...groceryTheme.typography.labelMd,
    color: '#1A1C1C',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: groceryTheme.colors.surfaceContainerHighest,
    borderRadius: groceryTheme.radius.md,
    padding: 16,
    fontSize: 16,
    color: '#1A1C1C',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: groceryTheme.colors.danger,
    borderWidth: 1,
    backgroundColor: '#FFF0F0',
  },
  errorText: {
    ...groceryTheme.typography.caption,
    color: groceryTheme.colors.danger,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#D93900',
    borderRadius: groceryTheme.radius.md,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    ...groceryTheme.typography.labelMd,
    color: '#FFFFFF',
    letterSpacing: 2,
    fontSize: 16,
  },
  footerPrompt: {
    ...groceryTheme.typography.body,
    textAlign: 'center',
    color: groceryTheme.colors.textSecondary,
    marginBottom: 50,
  },
  footerLink: {
    ...groceryTheme.typography.labelMd,
    color: '#AD2B00',
  },
  bottomBranding: {
    ...groceryTheme.typography.caption,
    textAlign: 'center',
    color: '#999999',
    fontSize: 9,
    letterSpacing: 1.5,
  },
});

export default SignUpScreen;
