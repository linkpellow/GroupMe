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
        setError(response.data.message || 'Invalid password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="prelogin-outer">
      <form className="prelogin-card" onSubmit={handleSubmit}>
        <h2 className="prelogin-title">Enter your password</h2>
        <input
          type="password"
          className="prelogin-input"
          placeholder="Password"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        {error && <div className="prelogin-error">{error}</div>}
        <button className="prelogin-btn" type="submit" disabled={isLoading || !passcode.trim()}>
          {isLoading ? 'Checking...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};

export default PreLoginPasscode; 