import './App.css';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import CaseList from './pages/CaseList';
import React, { Suspense, lazy } from 'react';
const CaseDetails = lazy(() => import('./pages/CaseDetails'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Search = lazy(() => import('./pages/Search'));
const Data = lazy(() => import('./pages/Data'));
const Admin = lazy(() => import('./pages/Admin'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Login = lazy(() => import('./pages/Login'));
import { useAuth } from './context/AuthContext';
import { getMaintenance } from './api';
import { Modal } from 'antd';

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [maintenance, setMaintenance] = React.useState(null);
  const [dismissedMaintenance, setDismissedMaintenance] = React.useState(() => (sessionStorage.getItem('dismissedMaintenance') || null));

  React.useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const list = await getMaintenance();
        if (Array.isArray(list) && list.length) {
          const now = new Date();
          const active = list.find((m) => new Date(m.start) <= now && new Date(m.end) >= now);
          if (active && String(active.id) !== dismissedMaintenance) {
            setMaintenance(active);
          } else {
            setMaintenance(null);
          }
        }
      } catch (err) {
        // ignore; not fatal
      }
    };
    // Only check if user is logged in
    if (currentUser) fetchMaintenance();
  }, [currentUser, dismissedMaintenance]);

  React.useEffect(() => {
    if (maintenance) {
      Modal.info({
        title: 'Scheduled Maintenance',
        content: maintenance.message || 'Scheduled maintenance is active',
        okText: 'Understand',
        onOk: () => {
          sessionStorage.setItem('dismissedMaintenance', String(maintenance.id));
          setDismissedMaintenance(String(maintenance.id));
        },
      });
    }
  }, [maintenance]);
  // Map route to sidebar key
  const routeKeyMap = {
    '/': 'cases',
    '/cases': 'cases',
    '/case/:id': 'cases',
    '/statistics': 'statistics',
    '/search': 'search',
    '/data': 'data',
    '/admin': 'settings',
    '/settings': 'settings',
  };
  const selectedKey = Object.keys(routeKeyMap).find((route) => {
    if (route.includes(':')) {
      // Match dynamic route
      const base = route.split('/:')[0];
      return location.pathname.startsWith(base);
    }
    return location.pathname === route;
  }) ? routeKeyMap[location.pathname] : 'cases';

  // Redirect to login if not authenticated
  if (!currentUser && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // Redirect to cases if authenticated and on login page
  if (currentUser && location.pathname === '/login') {
    return <Navigate to="/cases" replace />;
  }

  return (
    <DashboardLayout
      selectedKey={selectedKey}
      onMenuClick={(key) => {
        switch (key) {
          case 'cases':
            navigate('/cases');
            break;
          case 'statistics':
            navigate('/statistics');
            break;
          case 'search':
            navigate('/search');
            break;
          case 'data':
            navigate('/data');
            break;
          case 'settings':
            // Navigate to admin for admin users, settings for others
            if ((currentUser?.role || '').toLowerCase() === 'admin') {
              navigate('/admin');
            } else {
              navigate('/settings');
            }
            break;
          default:
            navigate('/cases');
        }
      }}
      hideLayout={!currentUser}
    >
      {currentUser ? (
        <Routes>
          <Route path="/" element={<CaseList />} />
          <Route path="/cases" element={<CaseList />} />
          <Route path="/case/:id" element={<Suspense fallback={<div>Loading...</div>}><CaseDetails /></Suspense>} />
          <Route path="/statistics" element={<Suspense fallback={<div>Loading...</div>}><Statistics /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<div>Loading...</div>}><Search /></Suspense>} />
          <Route path="/data" element={<Suspense fallback={<div>Loading...</div>}><Data /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<div>Loading...</div>}><Admin /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<div>Loading...</div>}><AccountSettings /></Suspense>} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Suspense fallback={<div>Loading...</div>}><Login /></Suspense>} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

export default App;
