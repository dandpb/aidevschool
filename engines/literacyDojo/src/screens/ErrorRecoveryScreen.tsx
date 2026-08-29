import { SupportCta } from "../components/SupportCta";

/** Visible recovery destination when a lesson or local storage fails. */
export function ErrorRecoveryScreen({
  message,
  onBack,
}: {
  message: string;
  onBack?: () => void;
}) {
  return (
    <section className="screen" data-testid="error-recovery-screen" aria-labelledby="error-title">
      <h1 id="error-title">Não foi possível continuar</h1>
      <p role="alert">{message}</p>
      <p className="muted">
        Recarregar a página ou voltar ao mapa é seguro. Isso não conclui a lição e não é competência
        verificada.
      </p>
      <SupportCta />
      {onBack ? (
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="error-back"
          onClick={onBack}
        >
          Voltar
        </button>
      ) : null}
    </section>
  );
}
