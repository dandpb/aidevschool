import { useEffect, useRef } from "react";
import { SupportCta } from "../components/SupportCta";

/** Visible recovery destination when a lesson or local storage fails. */
export function ErrorRecoveryScreen({
  message,
  onBack,
}: {
  message: string;
  onBack?: () => void;
}) {
  // AID-1755/T3 (padrão AID-1150): o h1 é focável (tabIndex=-1) e recebe
  // foco na montagem — quando a tela de recuperação entra (ex.: boot com
  // armazenamento corrompido), o leitor de tela reposiciona a leitura no
  // título "Não foi possível continuar". Semânticas separadas: o foco
  // anuncia o título, o role="alert" da mensagem anuncia o detalhe do erro.
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="screen" data-testid="error-recovery-screen" aria-labelledby="error-title">
      <h1 id="error-title" ref={headingRef} tabIndex={-1}>
        Não foi possível continuar
      </h1>
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
