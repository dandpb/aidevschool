/** Guidance only: it does not coordinate writes between app instances. */
export function TabSafetyNotice() {
  return (
    <span data-testid="tab-safety-notice">
      Use apenas uma aba ou janela deste aplicativo por vez: alterações simultâneas podem
      sobrescrever seu progresso.
    </span>
  );
}
