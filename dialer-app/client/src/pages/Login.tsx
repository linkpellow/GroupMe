import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import { HiEye, HiEyeSlash, HiCheck, HiX } from 'react-icons/hi2';
import {
  Input,
  InputGroup,
  InputRightElement,
  Button as CButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  IconButton,
  Alert,
  AlertIcon,
  Spinner,
  VisuallyHidden,
  Text,
  Box,
  HStack,
  VStack,
} from '@chakra-ui/react';

// Brand gradient background (green → yellow)
const lightOffwhiteStyle = {
  background: 'linear-gradient(135deg, #00a86b 0%, #28c76f 40%, #f9d423 100%)',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const togglePassword = () => setShowPassword((p) => !p);
  const toggleConfirmPassword = () => setShowConfirmPassword((p) => !p);
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { backgroundColor } = useTheme();

  // Password validation function
  const validatePassword = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    });
  };

  // Check if passwords match
  useEffect(() => {
    if (confirmPassword && password) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(false);
    }
  }, [password, confirmPassword]);

  // Validate password when it changes
  useEffect(() => {
    if (password) {
      validatePassword(password);
    }
  }, [password]);

  // Simple token check on mount - if token exists, try to go to leads
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found, redirecting to leads page');
      navigate('/leads');
    }
  }, [navigate]);

  // Add this to handle session validation on login page
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Start loading state
      setLoading(true);

      // Verify token in the background
      verifyTokenInBackground()
        .then((isValid) => {
          if (isValid) {
            // Token is valid, navigate to leads
            navigate('/leads');
          } else {
            // Token is invalid, clear it and stay on login page
            localStorage.removeItem('token');
            localStorage.removeItem('token_checked');
            localStorage.removeItem('user_data');
            setLoading(false);
          }
        })
        .catch(() => {
          // Error occurred, stay on login page
          setLoading(false);
        });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return; // Prevent multiple submissions
    }

    setError('');
    setSuccessMessage('');

    // Validate registration form
    if (isRegister) {
      if (!name || name.trim().length < 2) {
        setError('Name must be at least 2 characters long');
        return;
      }

      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      // Check password strength
      const isPasswordStrong = Object.values(passwordValidation).every(Boolean);
      if (!isPasswordStrong) {
        setError('Password must be at least 8 characters with uppercase, lowercase, and number');
        return;
      }

      // Check password confirmation
      if (!passwordsMatch) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        console.log('Attempting registration for:', email);

        // Show success message before redirecting
        setSuccessMessage('Account created successfully! Redirecting to dashboard...');

        // Use AuthContext register function for automatic login
        await register(name, email, password);
        
        console.log('Registration successful - user automatically logged in');
        
        // Small delay to show success message
        setTimeout(() => {
          // Navigate to leads after successful registration and auto-login
          navigate('/leads');
        }, 1500);
      } else {
        // Login flow
        console.log('Attempting login for:', email);

        try {
          // Use AuthContext login function
          const result = await login(email, password);
          
          if (result.success) {
            console.log('Login successful');
            // Navigate to leads after successful login
            navigate('/leads');
          } else {
            throw new Error('Login failed');
          }
        } catch (loginErr: any) {
          console.error('Login failed:', loginErr);
          throw loginErr;
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccessMessage('');
    // Clear form when switching modes
    if (!isRegister) {
      setPassword('');
      setConfirmPassword('');
      setName('');
      setPasswordValidation({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
      });
      setPasswordsMatch(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-lime-400 to-yellow-300">
      <div className="w-full max-w-md sm:max-w-lg space-y-8 bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-2xl">
        <div>
          <div className="flex justify-center items-center">
            <img
              src="/images/CROKODIAL-TITLE-LOGO.png"
              srcSet="/images/CROKODIAL-TITLE-LOGO.png 1x, /images/CROKODIAL-TITLE-LOGO.png 2x"
              alt="Crokodial Logo"
              className="h-16 w-auto object-contain drop-shadow-lg"
              style={{ maxWidth: '320px' }}
            />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-black">
            {isRegister ? 'Create a new account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <span>{error}</span>
            </Alert>
          )}
          {successMessage && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <span>{successMessage}</span>
            </Alert>
          )}
          <VStack spacing={4}>
            {isRegister && (
              <FormControl id="name" isRequired>
                <FormLabel><VisuallyHidden>Name</VisuallyHidden></FormLabel>
                <Input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  isDisabled={loading}
                />
              </FormControl>
            )}
            <FormControl id="email" isRequired>
              <FormLabel><VisuallyHidden>Email address</VisuallyHidden></FormLabel>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isDisabled={loading}
              />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel><VisuallyHidden>Password</VisuallyHidden></FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isDisabled={loading}
                />
                <InputRightElement pr={1}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <HiEyeSlash /> : <HiEye />}
                    onClick={togglePassword}
                    isDisabled={loading}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* Password confirmation field for registration */}
            {isRegister && (
              <FormControl id="confirmPassword" isRequired>
                <FormLabel><VisuallyHidden>Confirm Password</VisuallyHidden></FormLabel>
                <InputGroup>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    borderColor={confirmPassword ? (passwordsMatch ? 'green.500' : 'red.500') : undefined}
                    isDisabled={loading}
                  />
                  <InputRightElement pr={1}>
                    <HStack spacing={1}>
                      {confirmPassword && (
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          icon={showConfirmPassword ? <HiEyeSlash /> : <HiEye />}
                          onClick={toggleConfirmPassword}
                          isDisabled={loading}
                        />
                      )}
                      {confirmPassword && (
                        <Box color={passwordsMatch ? 'green.500' : 'red.500'}>
                          {passwordsMatch ? <HiCheck /> : <HiX />}
                        </Box>
                      )}
                    </HStack>
                  </InputRightElement>
                </InputGroup>
                {confirmPassword && !passwordsMatch && (
                  <FormErrorMessage>Passwords do not match</FormErrorMessage>
                )}
              </FormControl>
            )}

            {/* Password strength indicator for registration */}
            {isRegister && password && (
              <Box w="100%" p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" mb={2}>Password Requirements:</Text>
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Box color={passwordValidation.length ? 'green.500' : 'red.500'}>
                      {passwordValidation.length ? <HiCheck /> : <HiX />}
                    </Box>
                    <Text fontSize="xs">At least 8 characters</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Box color={passwordValidation.uppercase ? 'green.500' : 'red.500'}>
                      {passwordValidation.uppercase ? <HiCheck /> : <HiX />}
                    </Box>
                    <Text fontSize="xs">One uppercase letter</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Box color={passwordValidation.lowercase ? 'green.500' : 'red.500'}>
                      {passwordValidation.lowercase ? <HiCheck /> : <HiX />}
                    </Box>
                    <Text fontSize="xs">One lowercase letter</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Box color={passwordValidation.number ? 'green.500' : 'red.500'}>
                      {passwordValidation.number ? <HiCheck /> : <HiX />}
                    </Box>
                    <Text fontSize="xs">One number</Text>
                  </HStack>
                </VStack>
              </Box>
            )}
          </VStack>

          <div>
            <CButton
              type="submit"
              isLoading={loading}
              loadingText={isRegister ? 'Creating account...' : 'Signing in...'}
              width="100%"
              bgGradient="linear(to-r, green.500, lime.400, yellow.400)"
              _hover={{ bgGradient: 'linear(to-r, green.600, lime.500, yellow.500)' }}
              color="white"
              mt={2}
              isDisabled={isRegister && (!passwordsMatch || !Object.values(passwordValidation).every(Boolean))}
            >
              {isRegister ? 'Create Account' : 'Sign in'}
            </CButton>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-black hover:text-white hover:bg-black px-3 py-1 rounded transition-colors duration-200 text-xs"
              disabled={loading}
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer positioned at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 text-left py-3 z-10">
        <p className="text-xs text-green-900/90 font-medium pl-4">
          &copy; 2025 Crokodial. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// Update getStoredUserData in the Login component
async function verifyTokenInBackground() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use the CORRECT endpoint path
    const response = await axiosInstance.get('/api/auth/verify');

    if (response.data && response.data.valid && response.data.user) {
      // Store the verified user data
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      return true;
    } else {
      console.log('Token invalid, will clear on next navigation');
      return false;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}
