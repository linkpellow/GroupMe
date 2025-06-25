import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

// Brand gradient background (green → yellow)
const lightOffwhiteStyle = {
  background: 'linear-gradient(135deg, #00a86b 0%, #28c76f 40%, #f9d423 100%)',
};

export default function Login() {
  const [email, setEmail] = useState('admin@crokodial.com');
  const [password, setPassword] = useState('admin123');
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
  const loginBgStyle = {
    ...lightOffwhiteStyle,
    // Force the login page to use the default background, regardless of theme settings
  };

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
    <div
      className="min-h-screen flex items-center justify-center"
      style={loginBgStyle}
    >
      <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <div>
          <div className="flex justify-center items-center">
            <img
              src="/images/HEADER LOGO.png"
              alt="Crokodial Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-black">
            {isRegister ? 'Create a new account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-500 p-4">
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegister && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-t-md relative block w-full px-3 py-2 bg-white border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none ${isRegister ? (name ? 'rounded-none' : 'rounded-t-md') : 'rounded-t-md'} relative block w-full px-3 py-2 bg-white border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:z-10 sm:text-sm`}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 bg-white border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <HiEyeSlash className="h-4 w-4" />
                  ) : (
                    <HiEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 via-lime-500 to-yellow-400 hover:from-green-600 hover:via-lime-600 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
            >
              {loading
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                  ? 'Create Account'
                  : 'Sign in'}
            </button>
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
        <p className="text-xs text-green-950 font-medium pl-4">
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
