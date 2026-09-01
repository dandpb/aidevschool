import type { VerificationClient } from "../application/ports";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import { type LiteracyVerificationReceipt, validateReceipt } from "../domain/verification";

export class UnavailableVerificationClient implements VerificationClient {
  async verify(): Promise<LiteracyVerificationReceipt> {
    throw new Error("Verificação independente ainda não está configurada neste ambiente.");
  }
}

export class HttpVerificationClient implements VerificationClient {
  constructor(private readonly endpoint: string) {}

  async verify(record: LiteracyEvidenceRecord): Promise<LiteracyVerificationReceipt> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error("O verificador está indisponível. Tente novamente.");
    return validateReceipt(await response.json(), record);
  }
}
