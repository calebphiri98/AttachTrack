import './LedgerField.css';

export default function LedgerField({ label, error, mono, ...inputProps }) {
  return (
    <label className="ledger-field">
      <span className="ledger-field__label">{label}</span>
      <input
        className={`ledger-field__input${mono ? ' ledger-field__input--mono' : ''}${
          error ? ' ledger-field__input--error' : ''
        }`}
        {...inputProps}
      />
      {error && <span className="ledger-field__error">{error}</span>}
    </label>
  );
}
