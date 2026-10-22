import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Status';

// Wrap pages that need a logged-in user. Others are sent to /login and
// brought back here after logging in.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your account…" />;
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname, message: 'Please log in to continue.' }} />
    );
  }
  return children;
}
