import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import LedgerField from '../components/LedgerField';
import StampButton from '../components/StampButton';
import * as authApi from '../../../api/auth.api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successfully. You can now log in.' },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Set a new password"
      title="Reset password"
      subtitle="Choose a strong password to finish resetting your account."
    >
      <form onSubmit={handleSubmit} noValidate>
        <LedgerField
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          showToggle
        />

        {error && <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>}

        <StampButton type="submit" loading={loading}>
          Update password
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
