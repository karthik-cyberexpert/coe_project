import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { DashboardContext } from '@/contexts/DashboardContext';
import { showError } from '@/utils/toast';

const AdminProtectedRoute = () => {
  const { profile } = useContext(DashboardContext);

  if (!profile) {
    // The parent layout is handling the loading state, so we can return null here briefly.
    return null;
  }

  if (!profile.is_admin) {
    showError("You don't have permission to access this page.");
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;