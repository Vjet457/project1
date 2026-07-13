import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../utils/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outlined' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
  textStyle,
  gradientColors,
  icon,
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.textSmall;
      case 'large':
        return styles.textLarge;
      default:
        return styles.textMedium;
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.outlined;
      case 'text':
        return styles.textButton;
      case 'danger':
        return styles.danger;
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outlined':
        return Colors.primary;
      case 'text':
        return Colors.primary;
      case 'danger':
        return Colors.white;
      default:
        return Colors.white;
    }
  };

  const buttonStyle = [
    styles.button,
    getSizeStyle(),
    getVariantStyle(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    getTextSizeStyle(),
    { color: getTextColor() },
    textStyle,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </>
  );

  if (variant === 'primary' || variant === 'secondary') {
    const colors = gradientColors || 
      (variant === 'primary' ? Colors.gradients.primary : Colors.gradients.secondary);
    
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={fullWidth ? styles.fullWidth : undefined}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={buttonStyle}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
});

export default Button;
