import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
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
} from '@chakra-ui/react';

// Brand gradient background (green → yellow)
const lightOffwhiteStyle = {
  background: 'linear-gradient(135deg, #00a86b 0%, #28c76f 40%, #f9d423 100%)',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((p) => !p);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { backgroundColor } = useTheme();

  // Login page always uses its own background color, ignoring the theme context
  // const loginBgStyle = {
  //   ...lightOffwhiteStyle,
  //   // Force the login page to use the default background, regardless of theme settings
  // };

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
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) {
          setError('Name is required');
          setLoading(false);
          return;
        }

        console.log('Attempting registration for:', email);

        const response = await axiosInstance.post('/api/auth/register', {
          name,
          email,
          password,
        });

        if (response.data && response.data.token) {
          console.log('Registration successful');
          localStorage.setItem('token', response.data.token);

          // Also store user data for better state persistence
          if (response.data.user) {
            localStorage.setItem('user_data', JSON.stringify(response.data.user));
          }

          navigate('/leads');
        } else {
          throw new Error('No token received after registration');
        }
      } else {
        // Login flow
        console.log('Attempting login for:', email);

        try {
          // Direct API request
          const response = await axiosInstance.post('/api/auth/login', {
            email,
            password,
          });

          if (response.data && response.data.token) {
            console.log('Login successful');
            localStorage.setItem('token', response.data.token);

            // Also store user data for better state persistence
            if (response.data.user) {
              localStorage.setItem('user_data', JSON.stringify(response.data.user));
            }

            // Use the context login method (which might be async)
            login(email, password).catch((err) => {
              console.warn('Context login had an issue, but token is saved:', err);
            });

            // Immediately navigate to leads without waiting for context
            navigate('/leads');
          } else {
            throw new Error('No token received after login');
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
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegister && (
              <FormControl id="name" isRequired>
                <FormLabel><VisuallyHidden>Name</VisuallyHidden></FormLabel>
                <Input
                  placeholder="Username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>
            )}
            <FormControl id="email" isRequired mt={isRegister ? 2 : 0}>
              <FormLabel><VisuallyHidden>Email address</VisuallyHidden></FormLabel>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            <FormControl id="password" isRequired mt={2}>
              <FormLabel><VisuallyHidden>Password</VisuallyHidden></FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputRightElement pr={1}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <HiEyeSlash /> : <HiEye />}
                    onClick={togglePassword}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </div>

          <div>
            <CButton
              type="submit"
              isLoading={loading}
              loadingText={isRegister ? 'Creating account' : 'Signing in'}
              width="100%"
              bgGradient="linear(to-r, green.500, lime.400, yellow.400)"
              _hover={{ bgGradient: 'linear(to-r, green.600, lime.500, yellow.500)' }}
              color="white"
              mt={2}
            >
              {isRegister ? 'Create Account' : 'Sign in'}
            </CButton>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-black hover:text-white hover:bg-black px-3 py-1 rounded transition-colors duration-200 text-xs"
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
