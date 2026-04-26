import Button from '@components/Buttons/Button';
import supabase from '@config/supabase';
import { RootStackParamList } from '@src/Types/types';
import { groceryTheme } from '@src/Utils/groceryTheme';
import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificationScreen'>;

const VerificationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, userName, flow } = route.params;
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerification = async () => {
    if (!enteredCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      // Phone flows: verify OTP with Supabase
      if (flow === 'phone_signup' || flow === 'phone_signin') {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          phone,
          token: enteredCode,
          type: 'sms',
        });
        if (verifyError) throw verifyError;

        const userId = verifyData?.user?.id;

        if (!userId) {
          throw new Error('Unable to verify phone number');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_uuid: userId,
              user_email: verifyData?.user?.email || null,
              full_name: userName?.trim() || null,
              company_name: null,
              phone: phone || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_uuid' }
          );
        if (profileError) throw profileError;

        navigation.navigate('HomeScreen');
        return;
      }

      Alert.alert('Unknown verification flow');
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', (error as Error).message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Email Verification</Text>
        <Text style={styles.subtitle}>
          Enter the 4-digit code sent to {email}
        </Text>
        
        <TextInput
          value={enteredCode}
          onChangeText={setEnteredCode}
          keyboardType="numeric"
          style={styles.input}
          maxLength={4}
          placeholder="Enter verification code"
          editable={!loading}
        />

        <Button
          title={loading ? "Verifying..." : "Verify Code"}
          onPress={handleVerification}
          disabled={loading || !enteredCode}
          containerStyle={styles.button}
        />
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
  }
});

export default VerificationScreen;
