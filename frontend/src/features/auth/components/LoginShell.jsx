import './LoginShell.css';

export default function LoginShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="login-shell">
      <div className="login-shell__card">
        <main className="login-shell__panel">
          <div className="login-shell__brand">
            <span className="login-shell__mark">AT</span>
            <span className="login-shell__wordmark">AttachTrack</span>
          </div>

          <div className="login-shell__form-wrap">
            {eyebrow && <span className="login-shell__eyebrow">{eyebrow}</span>}
            <h1 className="login-shell__title">{title}</h1>
            {subtitle && <p className="login-shell__subtitle">{subtitle}</p>}
            {children}
          </div>

          <p className="login-shell__footer">
            Malawi University of Business and Applied Sciences
          </p>
        </main>

        <aside className="login-shell__visual" aria-hidden="true">
          <div className="login-shell__caption">
            <span className="login-shell__rule" />
            <p className="login-shell__tagline">
              One record of your industrial attachment submissions, feedback,
              and grading, kept in one place from placement to sign-off.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}