import { useState } from 'react';
import styles from './ExportButton.module.css';

const FORMATS = [
  { value: 'csv', label: 'CSV spreadsheet' },
  { value: 'pdf', label: 'PDF document' },
  { value: 'docx', label: 'Word document' },
];

export default function ExportButton({ children = 'Export', onClick, disabled = false, ...props }) {
  const [format, setFormat] = useState('csv');
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onClick?.(format);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.export}>
      <label className={styles.label}>
        <span className={styles.srOnly}>Export format</span>
        <select
          className={styles.select}
          aria-label="Export format"
          value={format}
          onChange={(event) => setFormat(event.target.value)}
          disabled={busy || disabled}
        >
          {FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <button
        type="button"
        onClick={download}
        className={styles.button}
        disabled={busy || disabled}
        {...props}
      >
        {busy ? 'Preparing...' : children}
      </button>
    </div>
  );
}
