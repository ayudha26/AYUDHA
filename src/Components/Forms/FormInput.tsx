import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Controller, Control } from 'react-hook-form';
import Button from '@components/Buttons/Button';
import { groceryTheme } from '@src/Utils/groceryTheme';

interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  rules?: object;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'tel';
  maxLength?: number;
  sanitizeInput?: (value: string) => string;
}

export interface CustomFormProps {
  fields: FormField[];
  control: Control<any>;
  onSubmit: (data: any) => void;
  submitButtonText?: string;
  disabled?: boolean;
}

const CustomForm = ({ 
  fields, 
  control, 
  onSubmit, 
  submitButtonText = 'Submit',
  disabled = false 
}: CustomFormProps) => {
  const isButtonDisabled = disabled;

  return (
    <View style={styles.container}>
      {fields.map((field) => (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.label}>{field.label}</Text>
          <Controller
            control={control}
            name={field.name}
            rules={field.rules}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <>
                <TextInput
                  style={[
                    styles.input,
                    error && styles.inputError
                  ]}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(field.sanitizeInput ? field.sanitizeInput(text) : text)}
                  value={value}
                  placeholder={field.placeholder}
                  placeholderTextColor={groceryTheme.colors.textMuted}
                  secureTextEntry={field.secureTextEntry}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                  autoComplete={field.autoComplete}
                  maxLength={field.maxLength}
                />
                {error && (
                  <Text style={styles.errorText}>
                    {String(error.message || 'This field is required')}
                  </Text>
                )}
              </>
            )}
          />
        </View>
      ))}
      <Button
        title={submitButtonText}
        onPress={onSubmit}
        containerStyle={StyleSheet.flatten([
          styles.submitButton,
          isButtonDisabled && styles.submitButtonDisabled
        ])}
        titleStyle={StyleSheet.flatten([
          styles.submitButtonText,
          isButtonDisabled && styles.submitButtonTextDisabled
        ])}
        disabled={isButtonDisabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: groceryTheme.spacing.lg,
  },
  fieldContainer: {
    marginBottom: groceryTheme.spacing.lg,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: groceryTheme.colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    padding: 12,
    borderRadius: groceryTheme.radius.md,
    fontSize: 16,
    color: groceryTheme.colors.textPrimary,
    backgroundColor: groceryTheme.colors.surface,
  },
  inputError: {
    borderColor: groceryTheme.colors.danger,
  },
  errorText: {
    color: groceryTheme.colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    padding: 16,
    borderRadius: groceryTheme.radius.md,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: groceryTheme.colors.disabled,
  },
  submitButtonText: {
    color: groceryTheme.colors.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
  submitButtonTextDisabled: {
    color: groceryTheme.colors.textMuted,
  },
});

export default CustomForm;
