import styles from './SectionShell.module.css';

const ICONS = {
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  chat: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  file: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11',
};

export default function SectionShell({ title, description, action, children }) {
  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export function EmptyBlock({ icon = 'file', title, children }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[icon] || ICONS.file} />
        </svg>
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
    </div>
  );
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}
