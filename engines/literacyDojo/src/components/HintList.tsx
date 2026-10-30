export function HintList({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null;
  return (
    <div className="hints" data-testid="hints-list">
      <p className="muted">Dicas:</p>
      <ol>
        {hints.map((hint, index) => (
          <li key={index}>{hint}</li>
        ))}
      </ol>
    </div>
  );
}
