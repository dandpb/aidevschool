import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupportCta } from "../../src/components/SupportCta";
import { PILOT_SUPPORT_EMAIL, supportWhatsAppHref } from "../../src/supportContact";

describe("SupportCta", () => {
  it("mostra WhatsApp como canal principal e email como backup", () => {
    render(<SupportCta />);
    const whatsapp = screen.getByTestId("support-whatsapp");
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/5511984363878");
    expect(whatsapp).toHaveTextContent("WhatsApp");
    const email = screen.getByTestId("support-email");
    expect(email).toHaveAttribute("href", expect.stringContaining(`mailto:${PILOT_SUPPORT_EMAIL}`));
    expect(email).toHaveTextContent(PILOT_SUPPORT_EMAIL);
    expect(supportWhatsAppHref()).toBe("https://wa.me/5511984363878");
  });
});
