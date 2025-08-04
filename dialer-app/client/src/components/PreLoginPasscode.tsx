import React, { useState } from 'react';
import axios from 'axios';

interface PreLoginPasscodeProps {
  onPasscodeValid: () => void;
}

const PreLoginPasscode: React.FC<PreLoginPasscodeProps> = ({ onPasscodeValid }) => {
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/validate-passcode', { code: passcode.trim() });
      if (response.data.success) {
        localStorage.setItem('prelogin_passcode_valid', 'true');
        onPasscodeValid();
      } else {
        setError(response.data.message || 'Invalid invite code');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="prelogin-outer">
      <form className="prelogin-card" onSubmit={handleSubmit}>
        <h2 className="prelogin-title">Enter your invite code</h2>
        <p className="prelogin-subtitle">Please enter the invite code provided to you to access Crokodial</p>
        <input
          type="text"
          className="prelogin-input"
          placeholder="Enter invite code (e.g., ABC12345)"
          value={passcode}
          onChange={e => setPasscode(e.target.value.toUpperCase())}
          disabled={isLoading}
          autoFocus
          maxLength={20}
        />
        {error && <div className="prelogin-error">{error}</div>}
        <button className="prelogin-btn" type="submit" disabled={isLoading || !passcode.trim()}>
          {isLoading ? 'Validating...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};

export default PreLoginPasscode; 