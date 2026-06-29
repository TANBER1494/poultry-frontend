import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Map for default redirects based on user roles in the Poultry ERP system
const ROLE_REDIRECT_MAP = {
  OWNER: '/owner/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  // Render a loading spinner while validating authentication state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect unauthorized roles to their designated default route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const defaultRoute = ROLE_REDIRECT_MAP[user.role] || '/login';
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;