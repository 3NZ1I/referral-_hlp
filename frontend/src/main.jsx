import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'antd/dist/reset.css';
import { CasesProvider } from './context/CasesContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <CasesProvider>
          <App />
        </CasesProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Debugging: log React availability and the presence of hooks
try {
  // `React.version` is present in React, log to help debug duplicate/missing React instances
  console.info('React version (from entry):', React && React.version);
  if (!React || !React.useLayoutEffect) {
    console.error('React or React.useLayoutEffect is not available at runtime', React);
  }
} catch (err) {
  console.error('Error checking React availability:', err);
}
