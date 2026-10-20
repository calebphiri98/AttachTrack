import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LoginShell from '../components/LoginShell';
import LedgerField from '../components/LedgerField';
import StampButton from '../components/StampButton';
import { useAuth } from '../../../context/AuthContext';

const DESTINATIONS = {
  industry_supervisor: '/industry/students',
  student: '/student/dashboard',
  university_supervisor: '/university/students',
  admin: '/admin/dashboard',
  hod: '/hod/dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice] = useState(location.state?.message || '');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(DESTINATIONS[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Your dashboard, submissions, and messages are waiting."
    >
      <form onSubmit={handleSubmit} noValidate>
        <LedgerField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <LedgerField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          showToggle
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 0 16px' }}>
          <Link to="/forgot-password" style={{ color: 'var(--stamp)', fontWeight: 500, fontSize: '0.82rem' }}>
            Forgot password?
          </Link>
        </div>

        {notice && (
          <p style={{ color: 'var(--stamp)', fontSize: '0.88rem', marginBottom: 16 }}>{notice}</p>
        )}
        {error && <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>}

        <StampButton type="submit" loading={loading}>
          Log in
        </StampButton>
      </form>

      <p style={{ marginTop: 24, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
        New here?{' '}
        <Link to="/signup" style={{ color: 'var(--stamp)', fontWeight: 500 }}>
          Create an account
        </Link>
      </p>
    </LoginShell>
  );
}
