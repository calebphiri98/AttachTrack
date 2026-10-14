import { useEffect, useRef, useState } from 'react';
import './SectionTabs.css';

export default function SectionTabs({ items, activeId, onChange, label = 'Sections' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = items.find((item) => item.id === activeId) || items[0];

  useEffect(() => {
    if (!open) return undefined;

    function handlePointer(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function select(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <nav className="section-tabs" ref={rootRef} aria-label={label}>
      <div className="section-tabs__bar">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`section-tabs__tab${item.id === active.id ? ' section-tabs__tab--active' : ''}`}
            aria-current={item.id === active.id ? 'true' : undefined}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="section-tabs__mobile">
        <button
          type="button"
          className="section-tabs__trigger"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls="section-tabs-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="section-tabs__trigger-text">
            <span className="section-tabs__trigger-hint">Section</span>
            <span className="section-tabs__trigger-label">{active.label}</span>
          </span>
          <span className={`section-tabs__burger${open ? ' section-tabs__burger--open' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        {open && (
          <ul id="section-tabs-menu" className="section-tabs__menu">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`section-tabs__option${item.id === active.id ? ' section-tabs__option--active' : ''}`}
                  aria-current={item.id === active.id ? 'true' : undefined}
                  onClick={() => select(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}