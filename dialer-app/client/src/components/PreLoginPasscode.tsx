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
      console.log('PreLoginPasscode: Validating passcode:', passcode.trim());
      
      // First validate the passcode
      const validateResponse = await axios.post('/api/auth/validate-passcode', { code: passcode.trim() });
      console.log('PreLoginPasscode: Validation response:', validateResponse.data);
      
      if (validateResponse.data.success) {
        console.log('PreLoginPasscode: Passcode valid, consuming...');
        
        // Then consume the passcode
        const consumeResponse = await axios.post('/api/auth/consume-passcode', { code: passcode.trim() });
        console.log('PreLoginPasscode: Consumption response:', consumeResponse.data);
        
        if (consumeResponse.data.success) {
          console.log('PreLoginPasscode: Passcode consumed successfully, setting localStorage and redirecting');
          localStorage.setItem('prelogin_passcode_valid', 'true');
          
          // Call the callback to update parent state
          onPasscodeValid();
          
          // Force a page reload to ensure the state is properly set
          console.log('PreLoginPasscode: Redirecting to /login');
          window.location.href = '/login';
        } else {
          setError(consumeResponse.data.message || 'Failed to use passcode');
        }
      } else {
        setError(validateResponse.data.message || 'Invalid passcode');
      }
    } catch (err: any) {
      console.error('PreLoginPasscode: Error during passcode validation:', err);
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