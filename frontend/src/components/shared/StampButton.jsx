import './StampButton.css';

export default function StampButton({ children, loading, ...buttonProps }) {
  return (
    <button className="stamp-button" disabled={loading} {...buttonProps}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
