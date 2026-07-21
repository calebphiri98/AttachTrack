import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import LedgerField from '../components/LedgerField';
import StampButton from '../components/StampButton';
import StampBadge from '../components/StampBadge';
import * as authApi from '../../../api/auth.api';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !code.trim()) {
      setError('Enter your email and the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code });
      setDone(true);
      setTimeout(() => navigate('/login', { state: { email } }), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      await authApi.resendCode({ email });
      setResendMessage('New code sent — check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <AuthShell eyebrow="Step 2 of 2" title="Email verified">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
          <StampBadge label="Verified" />
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', textAlign: 'center' }}>
            Taking you to log in now.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent you. It expires after a few minutes."
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
          label="Verification code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          mono
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
        />

        {error && <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>}
        {resendMessage && (
          <p style={{ color: 'var(--sage)', fontSize: '0.88rem', marginBottom: 16 }}>{resendMessage}</p>
        )}

        <StampButton type="submit" loading={loading}>
          Verify email
        </StampButton>
      </form>

      <p style={{ marginTop: 24, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
        Didn't get a code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--stamp)',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
          }}
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </p>

      <p style={{ marginTop: 12, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
        <Link to="/login" style={{ color: 'var(--muted)' }}>
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
