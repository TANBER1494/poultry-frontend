import { lazy, Suspense, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute'; // Temporarily disabled

// Active Routes
const Login = lazy(() => import('../pages/auth/Login'));

/* =========================================================
   TODO: Uncomment components below as they are built
   ========================================================= */
const RegisterOwner = lazy(() => import('../pages/auth/RegisterOwner'));
const VerifyRegistration = lazy(
  () => import('../pages/auth/VerifyRegistration')
);
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

const OwnerLayout = lazy(() => import('../pages/owner/OwnerLayout'));
const OwnerDashboard = lazy(() => import('../pages/owner/OwnerDashboard'));
const FarmsManager = lazy(() => import('../pages/owner/FarmsManager'));
const BarnsManager = lazy(() => import('../pages/owner/BarnsManager'));
const CyclesManager = lazy(() => import('../pages/owner/CyclesManager'));
const CycleDetails = lazy(() => import('../pages/owner/CycleDetails'));
const SupervisorsManager = lazy(
  () => import('../pages/owner/SupervisorsManager')
);
const MerchantsManager = lazy(() => import('../pages/owner/MerchantsManager'));
const SalesManager = lazy(() => import('../pages/owner/SalesManager'));
const InventoryManager = lazy(() => import('../pages/owner/InventoryManager'));

const FinancesManager = lazy(() => import('../pages/owner/FinancesManager'));
const OwnerSettings = lazy(() => import('../pages/owner/OwnerSettings'));

const SupervisorLayout = lazy(
  () => import('../pages/supervisor/SupervisorLayout')
);
const DailyLogs = lazy(() => import('../pages/supervisor/DailyLogs'));
const SupervisorInventory = lazy(
  () => import('../pages/supervisor/SupervisorInventory')
);
const SupervisorEggSales = lazy(
  () => import('../pages/supervisor/SupervisorEggSales')
);
const SupervisorInvoices = lazy(
  () => import('../pages/supervisor/SupervisorInvoices')
);
const SupervisorWorkers = lazy(
  () => import('../pages/supervisor/SupervisorWorkers')
);
const SupervisorSettings = lazy(
  () => import('../pages/supervisor/SupervisorSettings')
);
const SubscriptionsManager = lazy(
  () => import('../pages/owner/SubscriptionsManager')
);

// const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
// const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
// const OrganizationsManager = lazy(() => import('../pages/admin/OrganizationsManager'));
// const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

// Smart Dispatcher: Evaluates root path access and routes based on user role
const SmartRoot = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    case 'OWNER':
      return <Navigate to="/owner/dashboard" replace />;
    case 'SUPERVISOR':
      return <Navigate to="/supervisor/daily-logs" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950 w-full transition-colors">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-emerald-600 font-semibold animate-pulse">
              Loading Poultry ERP...
            </p>
          </div>
        </div>
      }
    >
      <div className="animate-fade-in-rapid h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        <Routes>
          {/* Base entry point managed by SmartRoot */}
          <Route path="/" element={<SmartRoot />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />

          {/* Temporarily disabled until components are created */}
          <Route path="/register" element={<RegisterOwner />} />
          <Route path="/verify-registration" element={<VerifyRegistration />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Temporarily disabled Protected Routes */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <OwnerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboard />} />
            <Route path="farms" element={<FarmsManager />} />
            <Route path="farms/:farmId/barns" element={<BarnsManager />} />
            <Route path="supervisors" element={<SupervisorsManager />} />
            <Route path="cycles" element={<CyclesManager />} />
            <Route
              path="farms/:farmId/cycles/:cycleId"
              element={<CycleDetails />}
            />
            <Route path="merchants" element={<MerchantsManager />} />
            <Route path="sales" element={<SalesManager />} />
            <Route path="inventory" element={<InventoryManager />} />
            <Route path="subscriptions" element={<SubscriptionsManager />} />
            {/* <Route path="workers" element={<WorkersManager />} /> */}
            <Route path="finances" element={<FinancesManager />} />
            <Route path="settings" element={<OwnerSettings />} />
          </Route>

          <Route
            path="/supervisor"
            element={
              <ProtectedRoute allowedRoles={['SUPERVISOR']}>
                <SupervisorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="daily-logs" replace />} />
            <Route path="daily-logs" element={<DailyLogs />} />
            <Route path="inventory" element={<SupervisorInventory />} />
            <Route path="egg-sales" element={<SupervisorEggSales />} />
            <Route path="invoices" element={<SupervisorInvoices />} />
            <Route path="workers" element={<SupervisorWorkers />} />
            <Route path="settings" element={<SupervisorSettings />} />
          </Route>

          {/* <Route path="/admin" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
            ...
          </Route>
          */}

          {/* Fallback 404 Route */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-400">
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-lg">Page Not Found / Under Construction</p>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md font-medium"
                >
                  العودة للرئيسية
                </button>
              </div>
            }
          />
        </Routes>
      </div>
    </Suspense>
  );
};

export default AppRoutes;
