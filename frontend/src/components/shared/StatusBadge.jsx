import './StatusBadge.css';

const TONE_MAP = {
  linked: 'positive',
  present: 'positive',
  unlinked: 'negative',
  absent: 'negative',
  concern: 'negative',
  partial: 'neutral',
};

export default function StatusBadge({ children, tone }) {
  const resolvedTone = tone || TONE_MAP[String(children).toLowerCase()] || 'neutral';
  return <span className={`status-badge status-badge--${resolvedTone}`}>{children}</span>;
}
