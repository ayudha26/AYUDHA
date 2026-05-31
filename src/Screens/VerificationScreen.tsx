import Button from '@components/Buttons/Button';
import supabase, { supabaseKey, supabaseUrl } from '@config/supabase';
import { RootStackParamList } from '@src/Types/types';
import { groceryTheme } from '@src/Utils/groceryTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getOtpSendErrorMessage, normalizePhoneForOtp } from '@src/Utils/phoneAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificationScreen'>;

const VerificationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, userName, flow } = route.params;
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const isPhoneFlow = flow === 'phone_signup' || flow === 'phone_signin';
  const normalizedPhone = (() => {
    try {
      return normalizePhoneForOtp(phone);
    } catch {
      return phone;
    }
  })();

  const handleResendCode = async () => {
    if (!isPhoneFlow) {
      Alert.alert('Error', 'Resend is only available for phone verification.');
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      if (error) {
        throw new Error(getOtpSendErrorMessage(error, normalizedPhone));
      }

      Alert.alert('OTP sent', `A new verification code has been sent to ${normalizedPhone}.`);
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', (error as Error).message || 'Could not resend the verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleVerification = async () => {
    if (!enteredCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      // Phone flows: verify OTP with Supabase
      if (isPhoneFlow) {
        const token = enteredCode.trim();
        let verifyData;

        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            phone: normalizedPhone,
            token,
            type: 'sms',
          });
          if (verifyError) throw verifyError;
          verifyData = data;
        } catch (verifyError) {
          const errorMessage = (verifyError as Error).message || '';
          console.warn('verifyOtp SDK call failed, trying REST fallback:', verifyError);

          if (!errorMessage.toLowerCase().includes('network request failed')) {
            throw verifyError;
          }

          if (!supabaseUrl || !supabaseKey) {
            throw verifyError;
          }

          const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: normalizedPhone,
              token,
              type: 'sms',
            }),
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            const message =
              payload?.msg ||
              payload?.message ||
              `OTP verification failed with status ${response.status}.`;
            throw new Error(message);
          }

          const accessToken = payload?.access_token;
          const refreshToken = payload?.refresh_token;

          if (!accessToken || !refreshToken) {
            throw new Error('OTP verified, but Supabase did not return a session.');
          }

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          verifyData = sessionData;
        }

        const userId = verifyData?.user?.id;

        if (!userId) {
          throw new Error('Unable to verify phone number');
        }

        await AsyncStorage.setItem('userUuid', userId);

        // Don't block sign-in on a secondary profile write. ProfileScreen already
        // backfills missing rows when the user lands in the app.
        void (async () => {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert(
                {
                  user_uuid: userId,
                  user_email: verifyData?.user?.email || null,
                  full_name: userName?.trim() || verifyData?.user?.user_metadata?.full_name || null,
                  company_name: null,
                  phone: normalizedPhone || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_uuid' }
              );

            if (profileError) {
              console.warn('Profile upsert after OTP verification failed:', profileError);
            }
          } catch (profileError) {
            console.warn('Profile upsert after OTP verification failed:', profileError);
          }
        })();

        navigation.replace('HomeScreen');
        return;
      }

      Alert.alert('Unknown verification flow');
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = (error as Error).message || 'An error occurred during verification';
      if (errorMessage.toLowerCase().includes('network request failed')) {
        Alert.alert('Verification failed', 'We could not finish verification because the network request failed. Please try the code again once. If the issue continues, restart the app and sign in with the same phone number.');
        return;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{isPhoneFlow ? 'Phone Verification' : 'Verification'}</Text>
        <Text style={styles.subtitle}>
          {isPhoneFlow
            ? `Enter the verification code sent to ${normalizedPhone}`
            : 'Enter the verification code you received.'}
        </Text>
        
        <TextInput
          value={enteredCode}
          onChangeText={setEnteredCode}
          keyboardType="numeric"
          style={styles.input}
          maxLength={6}
          placeholder="Enter verification code"
          editable={!loading}
        />

        <Button
          title={loading ? "Verifying..." : "Verify Code"}
          onPress={handleVerification}
          disabled={loading || !enteredCode}
          containerStyle={styles.button}
        />

        {isPhoneFlow ? (
          <Button
            title={resending ? "Sending..." : "Resend Code"}
            onPress={handleResendCode}
            disabled={loading || resending}
            variant="outline"
            containerStyle={styles.secondaryButton}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: groceryTheme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: groceryTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: groceryTheme.colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    borderRadius: groceryTheme.radius.md,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: groceryTheme.colors.textPrimary,
    backgroundColor: groceryTheme.colors.surface,
  },
  button: {
    marginTop: 16,
  },
  secondaryButton: {
    marginTop: 12,
  },
});

export default VerificationScreen;
