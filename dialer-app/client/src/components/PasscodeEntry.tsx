import React, { useState } from 'react';
import axios from 'axios';

interface PasscodeEntryProps {
  onPasscodeValid: (passcode: string) => void;
  onCancel: () => void;
}

const PasscodeEntry: React.FC<PasscodeEntryProps> = ({ onPasscodeValid, onCancel }) => {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passcode.trim()) {
      setError('Please enter a passcode');
      return;
    }

    setIsLoading(true);
    setError('');
    setIsValidating(true);
    setAttempts(prev => prev + 1);

    try {
      const response = await axios.post('/api/auth/validate-passcode', {
        code: passcode.trim()
      });

      if (response.data.success) {
        // Passcode is valid, consume it and proceed
        await axios.post('/api/auth/consume-passcode', {
          code: passcode.trim()
        });
        
        onPasscodeValid(passcode.trim());
      } else {
        setError(response.data.message || 'Invalid passcode');
      }
    } catch (err: any) {
      console.error('Passcode validation error:', err);
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        const errorMessage = err.response.data.message;
        if (errorMessage.includes('expired')) {
          setError('This invite code has expired. Please contact your administrator for a new code.');
        } else if (errorMessage.includes('maximum usage')) {
          setError('This invite code has reached its usage limit. Please contact your administrator for a new code.');
        } else {
          setError(errorMessage || 'Invalid invite code. Please check and try again.');
        }
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Unable to validate invite code. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setPasscode(value);
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow only alphanumeric characters and common separators
    const allowedChars = /[A-Z0-9\-_]/;
    if (!allowedChars.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
      e.preventDefault();
    }
  };

  const getHelpText = () => {
    if (attempts >= 3) {
      return 'Having trouble? Contact your administrator for assistance.';
    }
    return 'Don\'t have an invite code? Contact your administrator.';
  };

  return (
    <div className="passcode-entry">
      <div className="passcode-header">
        <h2 className="passcode-title">Enter Invite Code</h2>
        <p className="passcode-subtitle">
          This website is invite-only. Please enter your invite code to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="passcode-form">
        <div className="passcode-input-group">
          <label htmlFor="passcode" className="passcode-label">
            Invite Code
          </label>
          <input
            id="passcode"
            type="text"
            value={passcode}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="e.g., ABC12345"
            className={`passcode-input ${error ? 'passcode-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="off"
            autoFocus
            maxLength={20}
            spellCheck="false"
          />
          {error && (
            <div className="passcode-error">
              <span className="passcode-error-icon">⚠️</span>
              {error}
            </div>
          )}
          {attempts > 0 && !error && !isLoading && (
            <div className="passcode-attempts">
              Attempt {attempts} of 5
            </div>
          )}
        </div>

        <div className="passcode-actions">
          <button
            type="button"
            onClick={onCancel}
            className="passcode-btn passcode-btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="passcode-btn passcode-btn-primary"
            disabled={isLoading || !passcode.trim() || attempts >= 5}
          >
            {isLoading ? (
              <span className="passcode-loading">
                <span className="passcode-spinner"></span>
                Validating...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>

      <div className="passcode-footer">
        <p className="passcode-help">
          {getHelpText()}
        </p>
        {attempts >= 3 && (
          <p className="passcode-troubleshoot">
            <strong>Tips:</strong> Check for typos, ensure caps lock is off, and verify the code hasn't expired.
          </p>
        )}
      </div>
    </div>
  );
};

export default PasscodeEntry; 