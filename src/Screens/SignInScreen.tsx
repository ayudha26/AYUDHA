import React, { useState } from 'react';
import { StyleSheet, Text, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useForm } from 'react-hook-form';
import CustomForm from '../Components/Forms/FormInput';
import ScreenHeader from '@components/Layouts/ScreenHeader';
import { FormData, FormField } from '../Types/types';
import supabase, { isSupabaseConfigured } from '@config/supabase';
import { groceryTheme } from '@src/Utils/groceryTheme';
import { formatIndianPhoneInput, getOtpSendErrorMessage, normalizePhoneForOtp } from '@src/Utils/phoneAuth';

const SignInScreen = ({ navigation }) => {
  const { control, handleSubmit } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      phone: '',
    }
  });
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
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to continue.');
      }

      const phone = normalizePhoneForOtp(data.phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) {
        throw new Error(getOtpSendErrorMessage(error, phone));
      }

      navigation.navigate('VerificationScreen', { phone, flow: 'phone_signin' });
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formFields: FormField[] = [
    {
      name: 'phone',
      label: 'Phone',
      placeholder: '98765 43210',
      rules: {
        required: 'Phone number is required',
        validate: (value: string) => {
          try {
            normalizePhoneForOtp(value);
            return true;
          } catch (error) {
            return (error as Error).message;
          }
        },
      },
      keyboardType: 'phone-pad',
      autoComplete: 'tel',
      maxLength: 11,
      sanitizeInput: formatIndianPhoneInput,
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
          <View style={styles.formWrap}>
            <Text style={styles.helperText}>
              Enter your 10-digit mobile number. We&apos;ll automatically use the India country code (+91) and send you a verification code.
            </Text>
            <CustomForm
              fields={formFields}
              control={control}
              onSubmit={handleSubmit(sendDataToSupabase)}
              submitButtonText={loading ? "Sending OTP..." : "Send OTP"}
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
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 12,
    color: groceryTheme.colors.textSecondary,
    textAlign: 'center',
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
