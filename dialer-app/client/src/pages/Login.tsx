import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasscodeEntry from '../components/PasscodeEntry';
import './login.css';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasscodeEntry, setShowPasscodeEntry] = useState(false);
  const [passcodeValidated, setPasscodeValidated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
  
  const navigate = useNavigate();
  const { login, register } = useAuth();

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
    if (isSignUp) {
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
      if (isSignUp) {
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

  const handleSignUpClick = () => {
    setIsSignUp(true);
    setShowPasscodeEntry(true);
  };

  const handleLoginClick = () => {
    setIsSignUp(false);
    setShowPasscodeEntry(false);
    setPasscodeValidated(false);
    setError('');
    setSuccessMessage('');
  };

  const handlePasscodeValid = (passcode: string) => {
    setPasscodeValidated(true);
    setShowPasscodeEntry(false);
  };

  const handlePasscodeCancel = () => {
    setShowPasscodeEntry(false);
    setIsSignUp(false);
    setPasscodeValidated(false);
  };

  // Show passcode entry if user is trying to sign up
  if (showPasscodeEntry) {
    return (
      <main className="login__outer">
        <PasscodeEntry
          onPasscodeValid={handlePasscodeValid}
          onCancel={handlePasscodeCancel}
        />
      </main>
    );
  }

  return (
    <main className="login__outer">
      <section className="login__card">
        <img
          src="/images/HEADER LOGO.png"
          alt="Crokodial header logo"
          className="login__logo"
          style={{ marginBottom: '0.5rem', width: '120px' }}
        />
        <img
          src="/images/CROKODIAL-TITLE-LOGO.png"
          alt="Crokodial logo"
          className="login__logo"
        />

        <h1 className="login__title">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </h1>

        {isSignUp && passcodeValidated && (
          <div className="login__passcode-success">
            <p className="login__passcode-message">
              ✅ Invite code validated successfully
            </p>
          </div>
        )}

        {error && (
          <div className="login__error">
            <p className="login__error-message">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="login__success">
            <p className="login__success-message">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login__form">
          {isSignUp && (
            <label className="login__label">
              Full Name
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="login__input"
                disabled={loading}
              />
            </label>
          )}

          <label className="login__label">
            Email
            <input
              type="email"
              autoComplete={isSignUp ? "email" : "email"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login__input"
              disabled={loading}
            />
          </label>

          <label className="login__label">
            Password
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login__input"
              disabled={loading}
            />
          </label>

          {isSignUp && (
            <label className="login__label">
              Confirm Password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`login__input ${confirmPassword && !passwordsMatch ? 'login__input-error' : ''}`}
                disabled={loading}
              />
            </label>
          )}

          {isSignUp && (
            <div className="login__password-strength">
              <div className={`login__strength-item ${passwordValidation.length ? 'login__strength-valid' : ''}`}>
                {passwordValidation.length ? '✓' : '○'} At least 8 characters
              </div>
              <div className={`login__strength-item ${passwordValidation.uppercase ? 'login__strength-valid' : ''}`}>
                {passwordValidation.uppercase ? '✓' : '○'} One uppercase letter
              </div>
              <div className={`login__strength-item ${passwordValidation.lowercase ? 'login__strength-valid' : ''}`}>
                {passwordValidation.lowercase ? '✓' : '○'} One lowercase letter
              </div>
              <div className={`login__strength-item ${passwordValidation.number ? 'login__strength-valid' : ''}`}>
                {passwordValidation.number ? '✓' : '○'} One number
              </div>
            </div>
          )}

          <button type="submit" className="login__btn" disabled={loading}>
            {loading ? (
              <span className="login__btn-loading">
                <span className="login__spinner"></span>
                {isSignUp ? "Creating Account..." : "Signing in..."}
              </span>
            ) : (
              isSignUp ? "Create Account" : "Sign in"
            )}
          </button>
        </form>

        <div className="login__toggle">
          <p className="login__toggle-text">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              type="button"
              onClick={isSignUp ? handleLoginClick : handleSignUpClick}
              className="login__toggle-btn"
              disabled={loading}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        <p className="login__footer">
          © {new Date().getFullYear()} Crokodial. All rights reserved.
        </p>
      </section>
    </main>
  );
}

// Background token verification function
async function verifyTokenInBackground(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}
