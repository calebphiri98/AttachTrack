import './StampBadge.css';

export default function StampBadge({ label }) {
  return (
    <div className="stamp-badge" role="status">
      <svg viewBox="0 0 120 120" className="stamp-badge__ring" aria-hidden="true">
        <circle cx="60" cy="60" r="52" />
        <circle cx="60" cy="60" r="44" />
      </svg>
      <span className="stamp-badge__label">{label}</span>
    </div>
  );
}
