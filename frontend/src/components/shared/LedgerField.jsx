import { useState } from 'react';
import './LedgerField.css';

export default function LedgerField({ label, error, mono, showToggle, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const shouldToggle = Boolean(showToggle || inputProps.type === 'password');
  const inputType = shouldToggle && visible ? 'text' : inputProps.type || 'text';

  return (
    <label className="ledger-field">
      <span className="ledger-field__label">{label}</span>
      <div className="ledger-field__input-wrap">
        <input
          className={`ledger-field__input${mono ? ' ledger-field__input--mono' : ''}${
            error ? ' ledger-field__input--error' : ''
          }${shouldToggle ? ' ledger-field__input--with-toggle' : ''}`}
          {...inputProps}
          type={inputType}
        />
        {shouldToggle && (
          <button
            type="button"
            className="ledger-field__toggle"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((prev) => !prev)}
          >
            {visible ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58A2 2 0 0013.42 13.42" />
                <path d="M9.88 5.08A12.32 12.32 0 0112 5c4.52 0 8.22 2.88 9.66 7-1.02 2.26-2.7 4.04-4.7 5.18" />
                <path d="M14.12 18.92A12.28 12.28 0 0112 19c-4.52 0-8.22-2.88-9.66-7 1.08-2.4 2.96-4.34 5.34-5.54" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <span className="ledger-field__error">{error}</span>}
    </label>
  );
}
