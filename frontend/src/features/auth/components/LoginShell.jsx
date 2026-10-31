import styles from './LoginShell.module.css';

export default function LoginShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <main className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.mark}>AT</span>
              <span className={styles.wordmark}>AttachTrack</span>
            </div>
            <span className={styles.headerLabel}>MUBAS PLATFORM</span>
          </header>

          <div className={styles.content}>
            <div className={styles.introduction}>
              {eyebrow && (
                <span className={styles.eyebrow}>{eyebrow}</span>
              )}
              <h1 className={styles.title}>{title}</h1>
              {subtitle && (
                <p className={styles.subtitle}>{subtitle}</p>
              )}
            </div>

            <div className={styles.formArea}>
              {children}
            </div>
          </div>

          <footer className={styles.footer}>
            <span>Malawi University of Business and Applied Sciences</span>
            <span>AttachTrack</span>
          </footer>
        </main>

        <aside className={styles.visual}>
          <div className={styles.visualImage} aria-hidden="true" />
          <div className={styles.visualContent}>
            <span className={styles.visualLabel}>
              INDUSTRIAL ATTACHMENT MANAGEMENT
            </span>
            <h2 className={styles.visualTitle}>
              Your attachment.
              <br />
              All in one place.
            </h2>
            <p className={styles.visualDescription}>
              Manage logbooks, attendance, reports and supervisor
              feedback through one connected platform.
            </p>
            <div className={styles.visualLine} />
            <span className={styles.visualFooter}>
              Built for students and supervisors.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
