import type { VerificationClient } from "../application/ports";
import { VerificationNotConfiguredError } from "../application/verificationErrors";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import { type LiteracyVerificationReceipt, validateReceipt } from "../domain/verification";

export class UnavailableVerificationClient implements VerificationClient {
  async verify(): Promise<LiteracyVerificationReceipt> {
    throw new VerificationNotConfiguredError(
      "Verificação independente ainda não está configurada neste ambiente.",
    );
  }
}

export class HttpVerificationClient implements VerificationClient {
  constructor(private readonly endpoint: string) {}

  async verify(record: LiteracyEvidenceRecord): Promise<LiteracyVerificationReceipt> {
    const body = JSON.stringify(record);
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    } catch {
      throw new Error("Não foi possível conectar ao verificador. Tente novamente.");
    }
    if (!response.ok) throw new Error("O verificador está indisponível. Tente novamente.");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Não foi possível ler a resposta do verificador. Tente novamente.");
    }
    return validateReceipt(payload, record);
  }
}
