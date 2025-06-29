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
      // First validate the passcode
      const validateResponse = await axios.post('/api/auth/validate-passcode', { code: passcode.trim() });
      if (validateResponse.data.success) {
        // Then consume the passcode
        const consumeResponse = await axios.post('/api/auth/consume-passcode', { code: passcode.trim() });
        if (consumeResponse.data.success) {
          localStorage.setItem('prelogin_passcode_valid', 'true');
          // Force a page reload to ensure the state is properly set
          window.location.href = '/login';
        } else {
          setError(consumeResponse.data.message || 'Failed to use passcode');
        }
      } else {
        setError(validateResponse.data.message || 'Invalid passcode');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid passcode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="prelogin-outer">
      <form className="prelogin-card" onSubmit={handleSubmit}>
        <h2 className="prelogin-title">Enter your invite code</h2>
        <input
          type="text"
          className="prelogin-input"
          placeholder="e.g., AH7D6U2H"
          value={passcode}
          onChange={e => setPasscode(e.target.value.toUpperCase())}
          disabled={isLoading}
          autoFocus
          style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
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