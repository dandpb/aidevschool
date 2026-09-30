// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHOOL_ENTRY } from "../../public/escola/entry-contract.js";

/*
 * AID-3453 static entry honesty suite (directive 17:14Z, proposal aa5bcb5a).
 * The public /escola/ page is a static port of the school-entry surface
 * (PR #615 @ 80c7addc). These tests pin the honesty contract of that port:
 * honest copy (F1/F2), read-only/no-backend/no-secrets (F3/F4), no operator
 * navigation, mechanical href allowlist (no invented hostnames), and a
 * drift guard against the school-entry source of truth.
 */

const escolaDir = new URL("../../public/escola/", import.meta.url);
const schoolEntryDir = new URL("../../../school-entry/", import.meta.url);

const indexHtml = readFileSync(new URL("index.html", escolaDir), "utf8");
const escolaJs = readFileSync(new URL("escola.js", escolaDir), "utf8");
const escolaCss = readFileSync(new URL("escola.css", escolaDir), "utf8");
const contractJs = readFileSync(new URL("entry-contract.js", escolaDir), "utf8");
const allStatic = `${indexHtml}\n${escolaJs}\n${contractJs}`;

/** Only real, verified public surfaces (docs/serving/README.md) may be linked. */
const OS_ALIAS = "https://aidevschool-codexdojo-os.netlify.app/";
const ALLOWED_EXTERNAL_HREFS = new Set([OS_ALIAS]);

/**
 * SHA-256 of the school-entry source files at the ported candidate
 * 80c7addc (PR #615). Any change on the school-entry side must be a
 * conscious re-port of /escola/ (update these pins in the same change).
 */
const SOURCE_PINS_80C7ADDC = {
  "public/index.html": "790701a886edeeee35fe3843975e940a5c7c27750e755361dd946444c75befdf",
  "public/app.js": "4a6da4b758cf5bfb09b97e567106f0e0b580526f4b711e910bfc92e9059aefe5",
  "public/styles.css": "01b83efe5e53a64ab62ab26ad52e66d99cee6a2a3eba41ff2b2e025f616c89d5",
  "server/catalog.mjs": "3cc1ef56e5c76020c5819de792ca99c6c4d9a2bd4caa951a52dea09ac4527673",
};

/** Canonical SCHOOL_ENTRY serialized from school-entry @ 80c7addc. */
const CANONICAL_CONTRACT_80C7ADDC = {
  schemaVersion: 1,
  fundamentals: {
    engineId: "literacyDojo",
    sequence: "avaliação inicial + trilha adaptativa",
    number: "TRILHA ADAPTATIVA",
    kicker: "COMECE AQUI · FUNDAMENTOS",
    title: "Fundamentos de IA",
    description:
      "Entender IA, uso seguro, prompt e contexto e verificação — lições curtas no app de lições. Você entra na jornada: uma avaliação curta no início define o ponto de partida, o app conduz a trilha e a ordem se adapta a você.",
    tags: ["Avaliação inicial · ordem adaptativa", "Tentativa com feedback", "Sem código"],
    tasks: [
      "Entrar no app de lições",
      "Responder a avaliação inicial curta",
      "Seguir a trilha — uma lição por vez",
      "Seu progresso fica no app de lições",
    ],
    cta: "Começar pelos fundamentos",
    note: "Jogos são prática opcional — nenhum pré-requisito depende deles.",
  },
  journeys: [
    {
      id: "cotidiano",
      audience: "JORNADA 1 · PARA QUEM NÃO PROGRAMA",
      title: "IA no cotidiano",
      description:
        "Use IA com segurança no dia a dia: e-mails, pesquisa, decisões. Parte dos mesmos fundamentos compartilhados.",
      engineId: "literacyDojo",
      preview: false,
      cta: "Começar pelos fundamentos",
    },
    {
      id: "dev",
      audience: "JORNADA 2 · PARA QUEM DESENVOLVE · PRÉVIA",
      title: "IA para Dev",
      description:
        "Construa software robusto com IA: intenção, plano, construção, teste e review. Comece pelos mesmos fundamentos; a ponte Dev é uma prévia planejada — o destino, não um percurso pronto no app.",
      engineId: "literacyDojo",
      preview: true,
      cta: "Começar pelos fundamentos",
      bridge: {
        label: "Depois dos fundamentos — ponte Dev (prévia planejada)",
        trackId: "dev",
        moduleId: "mod-05",
        lessons: [
          ["l15", "Quando usar IA e quando não usar"],
          ["l16", "Seu primeiro código com um assistente de IA"],
          ["l17", "Integre uma API de IA em um projeto real"],
          ["l21", "Peça testes que valem a pena"],
          ["l22", "Revise o código sugerido como engenheiro"],
          ["l23", "O que aceitar: limites do assistente"],
          ["l27", "Debug com assistente: reproduza antes de perguntar"],
          ["l28", "Refatore com assistente sem quebrar comportamento"],
          ["l29", "Avalie as dependências sugeridas"],
        ],
        note: "Prévia planejada: hoje o app de lições abre a trilha de fundamentos; esta ponte Dev (módulo 05 do currículo) ainda não faz parte do percurso do app — as lições acima mostram o destino planejado. Laboratórios 3D são prática opcional, não porta de entrada.",
      },
    },
  ],
};

describe("/escola/ static entry — honest copy (F1/F2)", () => {
  it("keeps the adaptive-truth positives from E1/E3/R6", () => {
    for (const required of [
      "Uma escola. Duas",
      "Trilha adaptativa",
      "avaliação",
      "COMECE AQUI",
      "entra na jornada",
      "prévia planejada",
      "não sincroniza",
      "progresso fica",
    ]) {
      expect(allStatic, `missing positive: ${required}`).toContain(required);
    }
  });

  it("carries no false-journey or gate-mirroring copy (ex-negatives E1–E7/R6)", () => {
    for (const forbidden of [
      "l01–l14",
      "l01-l14",
      "14 lições",
      "sequência curada",
      "sequência fixa",
      "no mesmo app",
      "retomar quando quiser",
      "próxima lição",
      "apresenta a próxima",
      "Confirmando disponibilidade",
      "não estão disponíveis agora",
      "Disponibilidade confirmada",
    ]) {
      expect(allStatic, `forbidden copy present: ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("/escola/ static entry — read-only, no backend, no secrets (F3/F4)", () => {
  it("has no API calls, storage access, credentials or admin navigation", () => {
    for (const forbidden of [
      "/api/",
      "fetch(",
      "XMLHttpRequest",
      "localStorage",
      "indexedDB",
      "document.cookie",
      "/admin",
      "Administração",
      "TYPESAFE",
      "apiKey",
      "csrf",
    ]) {
      expect(allStatic, `forbidden surface reference: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("drops the admin-link styles from the ported CSS", () => {
    expect(escolaCss).not.toContain("admin-link {");
    expect(escolaCss).not.toContain(".footer .admin-link");
  });
});

describe("/escola/ static entry — mechanical href allowlist (no invented hostnames)", () => {
  it("links only to the same-origin root, in-page anchors, local assets or the OS alias", () => {
    const hrefs = [...indexHtml.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const ok =
        href === "/" ||
        href.startsWith("#") ||
        href.startsWith("./") ||
        ALLOWED_EXTERNAL_HREFS.has(href);
      expect(ok, `href outside allowlist: ${href}`).toBe(true);
    }
  });

  it("uses only the same-origin root as CTA destination in the renderer", () => {
    const ctaCalls = [...escolaJs.matchAll(/ctaLink\("([^"]*)"/g)].map((m) => m[1]);
    expect(ctaCalls.length).toBeGreaterThanOrEqual(2);
    for (const href of ctaCalls) {
      expect(href).toBe("/");
    }
    expect(escolaJs).not.toMatch(/https?:\/\//);
  });

  it("marks the single cross-origin link as optional labs with rel=noopener", () => {
    expect(indexHtml).toContain(OS_ALIAS);
    expect(indexHtml).toContain('rel="noopener"');
  });
});

describe("/escola/ static entry — contract integrity and drift guard", () => {
  it("ports SCHOOL_ENTRY verbatim from school-entry @ 80c7addc", () => {
    expect(SCHOOL_ENTRY).toEqual(CANONICAL_CONTRACT_80C7ADDC);
  });

  // R3 (AID-3453, changes-requested FSE): o guard cross-source não pode
  // retornar cedo e em silêncio. Quando a fonte school-entry ainda não tem
  // SCHOOL_ENTRY (pré-merge do #615), o diff é SKIP explícito — os pins
  // 80c7addc permanecem seed e nada aqui é apresentado como verificação
  // cross-source executada. O #615 NÃO deve ser mergado só para ativar isto.
  const catalogUrl = new URL("server/catalog.mjs", schoolEntryDir);
  const catalogText = existsSync(catalogUrl) ? readFileSync(catalogUrl, "utf8") : null;
  const hasSchoolEntrySource = catalogText?.includes("SCHOOL_ENTRY") === true;
  it.skipIf(!hasSchoolEntrySource)(
    hasSchoolEntrySource
      ? "keeps the port in sync with the school-entry source when that source lands on main"
      : "keeps the port in sync with the school-entry source — SKIP EXPLÍCITO: school-entry sem SCHOOL_ENTRY nesta base (pré-merge #615; pins 80c7addc = seed, diff cross-source não executado)",
    () => {
      const catalog = readFileSync(catalogUrl, "utf8");
      expect(catalog).toContain("SCHOOL_ENTRY");
      for (const [relative, pinned] of Object.entries(SOURCE_PINS_80C7ADDC)) {
        const fileUrl = new URL(relative, schoolEntryDir);
        const digest = createHash("sha256").update(readFileSync(fileUrl)).digest("hex");
        expect(
          digest === pinned,
          `school-entry/${relative} drifted from the ported candidate 80c7addc — re-port /escola/ (or update the pins in the same change)`,
        ).toBe(true);
      }
    },
  );

  it("documents its provenance header", () => {
    expect(indexHtml).toContain("80c7addc");
    expect(escolaJs).toContain("80c7addc");
    expect(contractJs).toContain("80c7addc");
  });
});
