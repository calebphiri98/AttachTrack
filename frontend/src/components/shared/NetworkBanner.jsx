import { Link } from 'react-router-dom';
import { useNetworkStatus, useSyncSnapshot, useUnsyncedCount } from '../../offline/hooks';
import './offline.css';

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export default function NetworkBanner() {
  const network = useNetworkStatus();
  const sync = useSyncSnapshot();
  const counts = useUnsyncedCount();
  const waiting = counts.pending + counts.syncing;

  let tone = null;
  let text = '';

  if (network.status === 'offline') {
    tone = 'offline';
    text =
      waiting > 0
        ? `You are offline. Showing saved data. ${plural(waiting, 'change', 'changes')} will sync when you reconnect.`
        : 'You are offline. Showing saved data. Anything you record will sync when you reconnect.';
  } else if (network.status === 'unstable') {
    tone = 'unstable';
    text = 'Weak connection. Your work is saved on this device and will sync automatically.';
  } else if (sync.running || counts.syncing > 0) {
    tone = 'syncing';
    text = `Syncing ${plural(Math.max(waiting, 1), 'change', 'changes')}...`;
  } else if (counts.failed > 0) {
    tone = 'attention';
    text = `${plural(counts.failed, 'item needs', 'items need')} your attention.`;
  } else if (waiting > 0) {
    tone = 'syncing';
    text = `${plural(waiting, 'change is', 'changes are')} waiting to sync.`;
  }

  if (!tone) return null;

  return (
    <div className={`net-banner net-banner--${tone}`} role="status" aria-live="polite">
      <span>{text}</span>
      <Link to="/sync" className="net-banner__link">
        Sync Center
      </Link>
    </div>
  );
}
