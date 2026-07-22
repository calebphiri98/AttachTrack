import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SyncManager from './components/shared/SyncManager';
import './styles/tokens.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncManager />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}