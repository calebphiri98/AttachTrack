import styles from './StudentAvatar.module.css';

function getInitials(label) {
  const parts = (label || '?').trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function getHue(label) {
  let hash = 0;
  for (const ch of label || '') hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

export default function StudentAvatar({ name, email, size = 'md' }) {
  const label = name || email || '?';
  const hue = getHue(label);
  return (
    <span
      className={`${styles.avatar} ${styles[size]}`}
      style={{ '--hue': hue }}
      aria-hidden="true"
    >
      {getInitials(label)}
    </span>
  );
}
