import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import Colors from '../../utils/colors';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
}

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }
    
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[+]?[0-9]{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Enter a valid phone number';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password should be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      if (result.success && result.user && result.token) {
        await login(result.token, {
          ...result.user,
        });
      } else {
        Alert.alert('Registration Failed', result.error || 'Could not create account. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    field: keyof FormData,
    placeholder: string,
    iconName: string,
    options?: {
      secureTextEntry?: boolean;
      showToggle?: boolean;
      toggleState?: boolean;
      onToggle?: () => void;
      keyboardType?: TextInput['props']['keyboardType'];
      autoCapitalize?: TextInput['props']['autoCapitalize'];
    }
  ) => (
    <View style={styles.inputContainer}>
      <View style={[styles.inputWrapper, errors[field] && styles.inputError]}>
        <Icon name={iconName} size={20} color={Colors.secondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={formData[field]}
          onChangeText={(value) => updateField(field, value)}
          secureTextEntry={options?.secureTextEntry && !options?.toggleState}
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize ?? 'none'}
          autoCorrect={false}
        />
        {options?.showToggle && (
          <TouchableOpacity style={styles.passwordToggle} onPress={options.onToggle}>
            <Icon
              name={options.toggleState ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.secondary, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Icon name="heart-pulse" size={48} color={Colors.white} />
            </View>
          </View>
          
          <Text style={styles.headerTitle}>Join AarogyaSaathi</Text>
          <Text style={styles.headerSubtitle}>Create your health account</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.nameRow}>
            <View style={styles.halfWidth}>
              {renderInput('firstName', 'First Name', 'account', {
                autoCapitalize: 'words',
              })}
            </View>
            <View style={styles.halfWidth}>
              {renderInput('lastName', 'Last Name', 'account', {
                autoCapitalize: 'words',
              })}
            </View>
          </View>

          {renderInput('email', 'Email Address', 'email', {
            keyboardType: 'email-address',
          })}

          {renderInput('phoneNumber', 'Phone Number', 'phone', {
            keyboardType: 'phone-pad',
          })}

          {renderInput('password', 'Password', 'lock', {
            secureTextEntry: true,
            showToggle: true,
            toggleState: showPassword,
            onToggle: () => setShowPassword(!showPassword),
          })}

          {renderInput('confirmPassword', 'Confirm Password', 'lock-check', {
            secureTextEntry: true,
            showToggle: true,
            toggleState: showConfirmPassword,
            onToggle: () => setShowConfirmPassword(!showConfirmPassword),
          })}

          {/* Terms */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Register Button */}
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="large"
            gradientColors={[Colors.secondary, Colors.primary]}
            style={styles.registerButton}
          />

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  termsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  termsLink: {
    color: Colors.secondary,
    fontWeight: '500',
  },
  registerButton: {
    marginBottom: 24,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  signInLink: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
  },
});

export default RegisterScreen;
