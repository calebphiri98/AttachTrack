import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import LedgerField from '../components/LedgerField';
import RoleSelect from '../components/RoleSelect';
import StampButton from '../components/StampButton';
import StampBadge from '../components/StampBadge';
import * as authApi from '../../../api/auth.api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.signup(form);
      setDone(true);
      setTimeout(() => {
        navigate('/verify-email', { state: { email: form.email } });
      }, 900);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell eyebrow="Step 1 of 2" title="Account created">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
          <StampBadge label="Registered" />
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', textAlign: 'center' }}>
            Check your email for a verification code — taking you there now.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 1 of 2"
      title="Create your account"
      subtitle="Register once, then verify your email to activate it."
    >
      <form onSubmit={handleSubmit} noValidate>
        <RoleSelect value={form.role} onChange={(role) => updateField('role', role)} />

        <LedgerField
          label="Full name"
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          autoComplete="name"
        />
        <LedgerField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <LedgerField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        {serverError && (
          <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{serverError}</p>
        )}

        <StampButton type="submit" loading={loading}>
          Create account
        </StampButton>
      </form>

      <p style={{ marginTop: 24, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
        Already registered?{' '}
        <Link to="/login" style={{ color: 'var(--stamp)', fontWeight: 500 }}>
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
