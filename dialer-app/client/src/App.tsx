import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import Login from './pages/Login';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import MassText from './pages/MassText';
import Spreadsheet from './pages/Spreadsheet';
import CsvUpload from './pages/CsvUpload';
import Gmail from './pages/Gmail';
import Integrations from './pages/Integrations';
import Clients from './pages/Clients';
import GroupMePage from './pages/GroupMePage';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationSoundProvider } from './context/NotificationSoundContext';
import { NotesProvider } from './context/NotesContext';
import Dialer from './components/Dialer';
import DailyGoals from './components/DailyGoals';
import { checkJWTValidity } from './utils/clearAuthData';
import './App.css';
import GroupMeOAuthCallback from './pages/GroupMeOAuthCallback';
import NotesSyncer from './components/NotesSyncer';
import { FollowUpProvider } from './context/FollowUpContext';
import { FollowUpUIProvider } from './context/FollowUpUIContext';
import PreLoginPasscode from './components/PreLoginPasscode';
import PageOne from './pages/PageOne';
import PageTwo from './pages/PageTwo';
import GroupMeCallbackPage from './pages/GroupMeCallbackPage';
import LeadNotificationHandler from './components/LeadNotificationHandler';
// Fix linter errors for error type guard and missing module
// import { restoreDialerLayout } from './restore-dialer'; // Import the restore function

// Check JWT validity on app startup
checkJWTValidity();

// Configure query client with retry settings to avoid excessive polling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once
      staleTime: 10000, // Data is fresh for 10 seconds
      gcTime: 300000, // Cache data for 5 minutes (previously called cacheTime)
    },
  },
});

// Component that applies the dialer restoration
function DialerRestorer() {
  useEffect(() => {
    // Apply dialer restoration on component mount
    // Fix linter errors for error type guard and missing module
    // restoreDialerLayout();
  }, []);

  return null; // This component doesn't render anything
}

// Fix error boundary implementation
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorInfo: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    // Never break on auth errors - they're expected during transitions
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string' &&
      ((error as { message: string }).message.includes('auth') ||
        (error as { message: string }).message.includes('token'))
    ) {
      return { hasError: false, errorInfo: '' };
    }
    return {
      hasError: true,
      errorInfo:
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Unknown error',
    };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('App Error:', error, errorInfo);
  }

  // Reset error state when the location changes (navigation happens)
  componentDidUpdate() {
    if (this.state.hasError && window.location.pathname !== '/login') {
      this.setState({ hasError: false, errorInfo: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50">
          <div className="p-8 bg-white rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="mb-4">Please try refreshing the page or logging in again.</p>
            <button
              onClick={() => {
                // Clear token data to force a clean start
                localStorage.removeItem('token');
                localStorage.removeItem('token_checked');
                localStorage.removeItem('user_data');

                // Reset error state
                this.setState({ hasError: false, errorInfo: '' });

                // Redirect to login
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fix the PrivateRoute component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [loadingState, setLoadingState] = useState<'pending' | 'done'>('pending');

  // Direct check for token - the most reliable way to determine login state
  const token = localStorage.getItem('token');

  // Check if this is a detached dialer window - if so, skip auth check
  const params = new URLSearchParams(location.search);
  const isDetached = params.get('detached') === 'true';
  const isDirect = params.get('direct') === 'true';
  const bypassAuth = params.get('bypass') === 'auth';

  // Handle loading state
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setLoadingState('done');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoadingState('done');
    }, 3000);

    return () => clearTimeout(safetyTimer);
  }, []);

  // IMPORTANT: Always render content if token exists
  // This prevents white screens during auth checks
  if (token) {
    // If we have a token, immediately render children
    // Don't wait for context to be ready - it will catch up
    return <>{children}</>;
  }

  // Handle special cases
  if (isDetached || (isDirect && bypassAuth)) {
    return <>{children}</>;
  }

  // Show loading only if explicitly loading
  if (isLoading && loadingState === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50">
        <div className="p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-semibold text-gray-800">Loading Crokodial...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // Final check - if user context is loaded, use it
  if (user) {
    return <>{children}</>;
  }

  // If no token and no user, redirect to login
  return <Navigate to="/login" replace />;
}

const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivateRoute>
      {children}
    </PrivateRoute>
  );
};

function App() {
  const [passcodeValidated, setPasscodeValidated] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('prelogin_passcode_valid') === 'true') {
      setPasscodeValidated(true);
    }
  }, []);

  const handlePasscodeValid = () => {
    setPasscodeValidated(true);
  };

  // INTENTIONALLY THROW AN ERROR TO TEST THE ERROR BOUNDARY
  // if (process.env.NODE_ENV === 'development') {
  //   throw new Error('This is a test error to verify the ErrorBoundary component.');
  // }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotesProvider>
                <LeadProvider>
                  <ToastProvider>
                    <NotificationSoundProvider>
                      <NotificationProvider>
                        <FollowUpProvider>
                          <FollowUpUIProvider>
                            <NotesSyncer />
                            <DialerRestorer />
                            {/* Global lead notification listener, wrapped in its own boundary */}
                            <ErrorBoundary>
                              <LeadNotificationHandler />
                            </ErrorBoundary>
                            <Routes>
                              {!passcodeValidated ? (
                                <Route path="*" element={<PreLoginPasscode onPasscodeValid={handlePasscodeValid} />} />
                              ) : (
                                <>
                                  <Route path="/login" element={<Login />} />
                                  <Route path="/" element={<Navigate to="/login" />} />
                                  <Route path="/groupme/callback" element={<GroupMeOAuthCallback />} />
                                  <Route path="/groupme/handle-callback" element={<GroupMeCallbackPage />} />
                                  <Route
                                    path="/leads"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <ErrorBoundary>
                                            <Leads />
                                          </ErrorBoundary>
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/clients"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <Clients />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/dialer"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/gmail"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <Gmail />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/groupme"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <GroupMePage />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/mass-text"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <MassText />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/spreadsheet"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <Spreadsheet />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/csv-upload"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <CsvUpload />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/integrations"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <DailyGoals />
                                          <Integrations />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/settings"
                                    element={
                                      <AuthenticatedRoute>
                                        <DailyGoals />
                                        <Settings />
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/page-one"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <PageOne />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                  <Route
                                    path="/page-two"
                                    element={
                                      <AuthenticatedRoute>
                                        <Layout>
                                          <PageTwo />
                                        </Layout>
                                      </AuthenticatedRoute>
                                    }
                                  />
                                </>
                              )}
                            </Routes>
                          </FollowUpUIProvider>
                        </FollowUpProvider>
                      </NotificationProvider>
                    </NotificationSoundProvider>
                  </ToastProvider>
                </LeadProvider>
              </NotesProvider>
            </AuthProvider>
          </QueryClientProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
