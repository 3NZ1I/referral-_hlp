import './App.css';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import CaseList from './pages/CaseList';
import CaseDetails from './pages/CaseDetails';
import Statistics from './pages/Statistics';
import Search from './pages/Search';
import Data from './pages/Data';
import Admin from './pages/Admin';
import AccountSettings from './pages/AccountSettings';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

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
            if (currentUser?.role === 'admin') {
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
          <Route path="/case/:id" element={<CaseDetails />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/search" element={<Search />} />
          <Route path="/data" element={<Data />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<AccountSettings />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

export default App;
