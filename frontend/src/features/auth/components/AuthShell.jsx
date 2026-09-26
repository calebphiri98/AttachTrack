import './AuthShell.css';

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-shell__cover">
        <div className="auth-shell__watermark" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="86" />
            <circle cx="100" cy="100" r="70" />
          </svg>
        </div>
        <div className="auth-shell__brand">
          <span className="auth-shell__mark">AT</span>
          <span className="auth-shell__wordmark">AttachTrack</span>
        </div>
        <p className="auth-shell__tagline">
          One record of your industrial attachment — submissions, feedback,
          and grading, kept in one place from placement to sign-off.
        </p>
      </aside>

      <main className="auth-shell__page">
        <div className="auth-shell__form-wrap">
          {eyebrow && <span className="auth-shell__eyebrow">{eyebrow}</span>}
          <h1 className="auth-shell__title">{title}</h1>
          {subtitle && <p className="auth-shell__subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
