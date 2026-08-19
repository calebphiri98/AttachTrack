export default function ExportButton({ children = 'Export', onClick, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid var(--stamp)',
        background: 'var(--stamp)',
        color: '#fff',
        borderRadius: 999,
        padding: '10px 18px',
        fontWeight: 700,
        cursor: 'pointer',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
