import './Card.css';

export function Card({ children }) {
  return <div className="card">{children}</div>;
}

export function EmptyState({ children }) {
  return <p className="card__empty">{children}</p>;
}
