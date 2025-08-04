import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '10px',
    right: '10px',
    padding: '10px',
    background: 'rgba(0,0,0,0.8)',
    color: 'lime',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: 9999,
    border: '1px solid lime',
    borderRadius: '5px',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  button: {
    background: 'lime',
    color: 'black',
    border: 'none',
    padding: '5px 10px',
    margin: '5px',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '12px',
  },
};

const DebugPanel = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState<any>({});
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Collect debug info
    const collectInfo = async () => {
      try {
        setInfo({
          location: window.location.href,
          user: user ? 'Logged in' : 'Not logged in',
          userDetails: user,
          token: localStorage.getItem('token') ? 'Present' : 'Missing',
          localStorage: Object.keys(localStorage).length,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
        });
      } catch (error) {
        console.error('Error collecting debug info:', error);
      }
    };

    collectInfo();
    const interval = setInterval(collectInfo, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleForcePage = (path: string) => {
    window.location.href = `${window.location.origin}/${path}`;
  };

  if (!expanded) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'black',
          color: 'lime',
          padding: '5px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999,
        }}
        onClick={() => setExpanded(true)}
      >
        Debug
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ cursor: 'pointer', padding: '5px' }} onClick={() => setExpanded(false)}>
          [ - ]
        </span>
      </div>

      <h3 style={{ margin: '0 0 10px 0' }}>Debug Panel</h3>

      <div>
        <strong>Auth: </strong>
        {info.user}
        <br />
        <strong>Token: </strong>
        {info.token}
        <br />
        <strong>Screen: </strong>
        {info.screenSize}
        <br />
      </div>

      <div style={{ marginTop: '10px' }}>
        <button style={styles.button} onClick={handleReload}>
          Reload
        </button>
        <button style={styles.button} onClick={handleClearStorage}>
          Clear Storage
        </button>
        <button style={styles.button} onClick={() => handleForcePage('leads')}>
          Go to Leads
        </button>
        <button style={styles.button} onClick={() => handleForcePage('login')}>
          Go to Login
        </button>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10px' }}>
        <pre>{JSON.stringify(info.userDetails || {}, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DebugPanel;
