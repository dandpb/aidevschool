import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupportCta } from "../../src/components/SupportCta";
import { PILOT_SUPPORT_EMAIL, supportWhatsAppHref } from "../../src/supportContact";

describe("SupportCta", () => {
  it("mostra o email de suporte e omite WhatsApp enquanto o número está vazio", () => {
    render(<SupportCta />);
    const email = screen.getByTestId("support-email");
    expect(email).toHaveAttribute("href", expect.stringContaining(`mailto:${PILOT_SUPPORT_EMAIL}`));
    expect(email).toHaveTextContent(PILOT_SUPPORT_EMAIL);
    expect(screen.queryByTestId("support-whatsapp")).not.toBeInTheDocument();
    expect(supportWhatsAppHref()).toBeNull();
  });
});
