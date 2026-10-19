import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginShell from '../components/LoginShell';
import LedgerField from '../components/LedgerField';
import StampButton from '../components/StampButton';
import StampBadge from '../components/StampBadge';
import * as authApi from '../../../api/auth.api';

const RESTRICT_TO_MUBAS = true;
const MUBAS_EMAIL_REGEX = /^[^\s@]+@([a-zA-Z0-9-]+\.)*mubas\.ac\.mw$/i;

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = 'Enter a valid email';
    } else if (RESTRICT_TO_MUBAS && !MUBAS_EMAIL_REGEX.test(form.email)) {
      next.email = 'Student signup requires a MUBAS email address';
    }
    if (form.password.length < 8) next.password = 'At least 8 characters';
    if (!form.confirmPassword) {
      next.confirmPassword = 'Confirm your password';
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.signup({ name: form.name, email: form.email, password: form.password });
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
      <LoginShell eyebrow="Step 1 of 2" title="Account created">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
          <StampBadge label="Registered" />
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', textAlign: 'center' }}>
            Check your email for a verification code. Taking you there now.
          </p>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell
      eyebrow="Step 1 of 2"
      title="Create your student account"
      subtitle={
        RESTRICT_TO_MUBAS
          ? 'Register with your MUBAS email, then verify it to activate your account. Supervisor accounts are created by an administrator.'
          : 'Register with your email, then verify it to activate your account. Supervisor accounts are created by an administrator.'
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <LedgerField
          label="Full name"
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          autoComplete="name"
        />
        <LedgerField
          label={RESTRICT_TO_MUBAS ? 'MUBAS email' : 'Email'}
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
          showToggle
        />
        <LedgerField
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
          showToggle
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
    </LoginShell>
  );
}

// import { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import AuthShell from '../components/AuthShell';
// import LedgerField from '../components/LedgerField';
// import StampButton from '../components/StampButton';
// import StampBadge from '../components/StampBadge';
// import * as authApi from '../../../api/auth.api';

// const RESTRICT_TO_MUBAS = true;
// const MUBAS_EMAIL_REGEX = /^[^\s@]+@([a-zA-Z0-9-]+\.)*mubas\.ac\.mw$/i;

// export default function SignupPage() {
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [serverError, setServerError] = useState('');
//   const [done, setDone] = useState(false);

//   function updateField(field, value) {
//     setForm((prev) => ({ ...prev, [field]: value }));
//     setErrors((prev) => ({ ...prev, [field]: null }));
//   }

//   function validate() {
//     const next = {};
//     if (!form.name.trim()) next.name = 'Enter your full name';
//     if (!/^\S+@\S+\.\S+$/.test(form.email)) {
//       next.email = 'Enter a valid email';
//     } else if (RESTRICT_TO_MUBAS && !MUBAS_EMAIL_REGEX.test(form.email)) {
//       next.email = 'Student signup requires a MUBAS email address';
//     }
//     if (form.password.length < 8) next.password = 'At least 8 characters';
//     if (!form.confirmPassword) {
//       next.confirmPassword = 'Confirm your password';
//     } else if (form.confirmPassword !== form.password) {
//       next.confirmPassword = 'Passwords do not match';
//     }
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setServerError('');
//     if (!validate()) return;

//     setLoading(true);
//     try {
//       await authApi.signup({ name: form.name, email: form.email, password: form.password });
//       setDone(true);
//       setTimeout(() => {
//         navigate('/verify-email', { state: { email: form.email } });
//       }, 900);
//     } catch (err) {
//       setServerError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   if (done) {
//     return (
//       <AuthShell eyebrow="Step 1 of 2" title="Account created">
//         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
//           <StampBadge label="Registered" />
//           <p style={{ color: 'var(--muted)', fontSize: '0.92rem', textAlign: 'center' }}>
//             Check your email for a verification code. Taking you there now.
//           </p>
//         </div>
//       </AuthShell>
//     );
//   }

//   return (
//     <AuthShell
//       eyebrow="Step 1 of 2"
//       title="Create your student account"
//       subtitle={
//         RESTRICT_TO_MUBAS
//           ? 'Register with your MUBAS email, then verify it to activate your account. Supervisor accounts are created by an administrator.'
//           : 'Register with your email, then verify it to activate your account. Supervisor accounts are created by an administrator.'
//       }
//     >
//       <form onSubmit={handleSubmit} noValidate>
//         <LedgerField
//           label="Full name"
//           type="text"
//           value={form.name}
//           onChange={(e) => updateField('name', e.target.value)}
//           error={errors.name}
//           autoComplete="name"
//         />
//         <LedgerField
//           label={RESTRICT_TO_MUBAS ? 'MUBAS email' : 'Email'}
//           type="email"
//           value={form.email}
//           onChange={(e) => updateField('email', e.target.value)}
//           error={errors.email}
//           autoComplete="email"
//         />
//         <LedgerField
//           label="Password"
//           type="password"
//           value={form.password}
//           onChange={(e) => updateField('password', e.target.value)}
//           error={errors.password}
//           autoComplete="new-password"
//           showToggle
//         />
//         <LedgerField
//           label="Confirm password"
//           type="password"
//           value={form.confirmPassword}
//           onChange={(e) => updateField('confirmPassword', e.target.value)}
//           error={errors.confirmPassword}
//           autoComplete="new-password"
//           showToggle
//         />

//         {serverError && (
//           <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{serverError}</p>
//         )}

//         <StampButton type="submit" loading={loading}>
//           Create account
//         </StampButton>
//       </form>

//       <p style={{ marginTop: 24, fontSize: '0.88rem', color: 'var(--muted)', textAlign: 'center' }}>
//         Already registered?{' '}
//         <Link to="/login" style={{ color: 'var(--stamp)', fontWeight: 500 }}>
//           Log in
//         </Link>
//       </p>
//     </AuthShell>
//   );
// }
