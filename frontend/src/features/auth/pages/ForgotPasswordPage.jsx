import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import LedgerField from '../components/LedgerField';
import StampButton from '../components/StampButton';
import * as authApi from '../../../api/auth.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setLoading(true);
      const res = await authApi.forgotPassword({ email });
      setMessage(res.message);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password"
      subtitle="Enter the email linked to your account and we'll send a reset link."
    >
      <form onSubmit={handleSubmit} noValidate>
        <LedgerField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        {message && (
          <p style={{ color: 'var(--stamp)', fontSize: '0.88rem', marginBottom: 16 }}>{message}</p>
        )}
        {error && <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>}

        <StampButton type="submit" loading={loading}>
          Send reset link
        </StampButton>
      </form>

      <p style={{ marginTop: 24, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
        <Link to="/login" style={{ color: 'var(--stamp)', fontWeight: 500 }}>
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
