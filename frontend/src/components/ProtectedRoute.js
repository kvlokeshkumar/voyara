import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Loading } from './StatusViews';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading text="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (requireAdmin && !user.isAdmin) {
    return (
      <div className="v-status v-status-error" role="alert">
        <h2>Not authorized</h2>
        <p>This area is for administrators only.</p>
      </div>
    );
  }
  return children;
};

export default ProtectedRoute;
