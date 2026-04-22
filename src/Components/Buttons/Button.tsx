import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  TextStyle,
  ViewStyle,
  ActivityIndicator
} from 'react-native';
import { groceryTheme } from '@src/Utils/groceryTheme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  containerStyle,
  titleStyle,
  onPress,
  ...restProps
}) => {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'medium':
        return styles.mediumButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return groceryTheme.colors.textMuted;
    switch (variant) {
      case 'primary':
        return groceryTheme.colors.inverse;
      case 'secondary':
        return groceryTheme.colors.textPrimary;
      case 'outline':
        return groceryTheme.colors.brandDark;
      default:
        return groceryTheme.colors.inverse;
    }
  };

  const getTextSizeStyles = (): TextStyle => {
    switch (size) {
      case 'small':
        return styles.smallButtonText;
      case 'medium':
        return styles.mediumButtonText;
      case 'large':
        return styles.largeButtonText;
      default:
        return styles.mediumButtonText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabledButton,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      {...restProps}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[
              styles.buttonText,
              getTextSizeStyles(),
              { color: getTextColor() },
              disabled && styles.disabledButtonText,
              titleStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: groceryTheme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: groceryTheme.colors.brand,
  },
  secondaryButton: {
    backgroundColor: groceryTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: groceryTheme.colors.brand,
  },
  disabledButton: {
    backgroundColor: groceryTheme.colors.disabled,
    borderColor: groceryTheme.colors.disabled,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  smallButtonText: {
    fontSize: 13,
  },
  mediumButtonText: {
    fontSize: 15,
  },
  largeButtonText: {
    fontSize: 17,
  },
  disabledButtonText: {
    color: groceryTheme.colors.textMuted,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;