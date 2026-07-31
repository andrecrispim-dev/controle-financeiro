export function Loading({ text = 'Carregando...' }) {
  return <div className="loading" aria-live="polite">{text}</div>;
}
