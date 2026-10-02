/**
 * AID-3453 static entry — tipos do contrato SCHOOL_ENTRY portado de
 * engines/school-entry/server/catalog.mjs @ 80c7addc (PR #615 candidate).
 * O conteúdo é pinado por tests/static-entry/escola-honesty.test.ts; este
 * arquivo só descreve a forma para o tsc (o runtime é o .js puro ao lado).
 */
export interface EscolaBridgeLesson {
  0: string;
  1: string;
  length: 2;
}
export interface EscolaBridge {
  label: string;
  trackId: string;
  moduleId: string;
  lessons: EscolaBridgeLesson[];
  note: string;
}
export interface EscolaJourney {
  id: string;
  audience: string;
  title: string;
  description: string;
  engineId: string;
  preview: boolean;
  cta: string;
  bridge?: EscolaBridge;
}
export interface EscolaFundamentals {
  engineId: string;
  sequence: string;
  number: string;
  kicker: string;
  title: string;
  description: string;
  tags: string[];
  tasks: string[];
  cta: string;
  note: string;
}
export interface EscolaEntry {
  schemaVersion: number;
  fundamentals: EscolaFundamentals;
  journeys: EscolaJourney[];
}
export const SCHOOL_ENTRY: EscolaEntry;
