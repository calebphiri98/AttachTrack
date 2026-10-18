import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SyncManager from './components/shared/SyncManager';
import { SyncToasts, ToastProvider } from './components/shared/Toast';
import './styles/tokens.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SyncManager />
          <SyncToasts />
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
