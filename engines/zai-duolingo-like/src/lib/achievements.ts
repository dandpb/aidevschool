// Vertical Protocol — Achievement definitions
// Cozy cyberpunk badges that reward exploration, consistency, and mastery.

export interface AchievementDef {
  slug: string;
  title: string;
  description: string;
  // emoji icon + accent for the badge frame
  emoji: string;
  accent: "amber" | "teal" | "magenta" | "rose" | "violet";
  // gem reward for unlocking
  gemReward: number;
  xpReward: number;
  // category for grouping in the UI
  category: "inicio" | "trilha" | "ofensiva" | "mestre" | "explorador";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Início
  {
    slug: "primeiro-passo",
    title: "Primeiro Passo",
    description: "Complete sua primeira lição no Vertical Protocol.",
    emoji: "🌱",
    accent: "teal",
    gemReward: 5,
    xpReward: 10,
    category: "inicio",
  },
  {
    slug: "compilador-iniciante",
    title: "Compilador Iniciante",
    description: "Escolha seu caminho narrativo e diga seu nome.",
    emoji: "🧭",
    accent: "amber",
    gemReward: 3,
    xpReward: 5,
    category: "inicio",
  },
  // Trilha
  {
    slug: "modulo-padroes",
    title: "Caixa Preta Aberta",
    description: "Conclua o Módulo 1: O que é IA?",
    emoji: "🧠",
    accent: "amber",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-prompts",
    title: "Feiticeiro do Prompt",
    description: "Conclua o Módulo 2: Dominando o Chat.",
    emoji: "🔮",
    accent: "teal",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-riscos",
    title: "Guardião da Verdade",
    description: "Conclua o Módulo 3: O Lado Negro.",
    emoji: "🛡️",
    accent: "rose",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-imagens",
    title: "Pintor de Néon",
    description: "Conclua o Módulo 4: Imagens e Criatividade.",
    emoji: "🎨",
    accent: "magenta",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-pratica",
    title: "Compilador Profissional",
    description: "Conclua o Módulo 5: IA na Prática.",
    emoji: "💼",
    accent: "amber",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-maquina",
    title: "Abridor de Capô",
    description: "Conclua o Módulo 6: Por Dentro da Máquina.",
    emoji: "🔧",
    accent: "teal",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-contexto",
    title: "Curador de Contexto",
    description: "Conclua o Módulo 7: Contexto & Specs.",
    emoji: "🗂️",
    accent: "amber",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-agentes",
    title: "Comandante de Esquadrão",
    description: "Conclua o Módulo 8: Esquadrão de Agentes.",
    emoji: "🤖",
    accent: "magenta",
    gemReward: 10,
    xpReward: 25,
    category: "trilha",
  },
  {
    slug: "modulo-protocolo-final",
    title: "Guardião do Protocolo",
    description: "Conclua o Módulo 9: O Protocolo Final e instale seu workflow permanente.",
    emoji: "🏮",
    accent: "rose",
    gemReward: 15,
    xpReward: 40,
    category: "trilha",
  },
  {
    slug: "mestre-protocolo",
    title: "Mestre do Protocolo",
    description: "Conclua todas as 26 lições e salve o distrito.",
    emoji: "👑",
    accent: "amber",
    gemReward: 50,
    xpReward: 100,
    category: "mestre",
  },
  // Ofensiva
  {
    slug: "ofensiva-3",
    title: "Trinca de Dados",
    description: "Mantenha uma ofensiva de 3 dias.",
    emoji: "🔥",
    accent: "amber",
    gemReward: 8,
    xpReward: 15,
    category: "ofensiva",
  },
  {
    slug: "ofensiva-7",
    title: "Semana Perfeita",
    description: "Mantenha uma ofensiva de 7 dias.",
    emoji: "⚡",
    accent: "magenta",
    gemReward: 15,
    xpReward: 30,
    category: "ofensiva",
  },
  // Explorador
  {
    slug: "estrela-perfeita",
    title: "Estrela Perfeita",
    description: "Alcance 3 estrelas em qualquer lição.",
    emoji: "⭐",
    accent: "amber",
    gemReward: 5,
    xpReward: 10,
    category: "explorador",
  },
  {
    slug: "explorador-playground",
    title: "Alma Curiosa",
    description: "Envie seu primeiro prompt no Playground de IA.",
    emoji: "💫",
    accent: "teal",
    gemReward: 5,
    xpReward: 10,
    category: "explorador",
  },
  {
    slug: "liga-prata",
    title: "Subiu de Nível",
    description: "Alcance a Liga Prata.",
    emoji: "🥈",
    accent: "teal",
    gemReward: 12,
    xpReward: 20,
    category: "mestre",
  },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.slug, a])
);

export interface AchievementEvalContext {
  completedLessons: number;
  totalLessons: number;
  completedModuleSlugs: string[];
  streakCurrent: number;
  hasThreeStars: boolean;
  league: string;
  hasUsedPlayground: boolean;
  hasOnboarded: boolean;
}

// Returns the list of achievement slugs that should be unlocked given the context.
export function evaluateAchievements(ctx: AchievementEvalContext): string[] {
  const unlocked: string[] = [];
  if (ctx.hasOnboarded) unlocked.push("compilador-iniciante");
  if (ctx.completedLessons >= 1) unlocked.push("primeiro-passo");
  if (ctx.completedModuleSlugs.includes("o-que-e-ia")) unlocked.push("modulo-padroes");
  if (ctx.completedModuleSlugs.includes("dominando-o-chat")) unlocked.push("modulo-prompts");
  if (ctx.completedModuleSlugs.includes("o-lado-negro")) unlocked.push("modulo-riscos");
  if (ctx.completedModuleSlugs.includes("imagens-e-criatividade")) unlocked.push("modulo-imagens");
  if (ctx.completedModuleSlugs.includes("ia-na-pratica")) unlocked.push("modulo-pratica");
  if (ctx.completedModuleSlugs.includes("por-dentro-da-maquina")) unlocked.push("modulo-maquina");
  if (ctx.completedModuleSlugs.includes("contexto-e-specs")) unlocked.push("modulo-contexto");
  if (ctx.completedModuleSlugs.includes("esquadrao-de-agentes")) unlocked.push("modulo-agentes");
  if (ctx.completedModuleSlugs.includes("o-protocolo-final")) unlocked.push("modulo-protocolo-final");
  if (ctx.totalLessons > 0 && ctx.completedLessons >= ctx.totalLessons) unlocked.push("mestre-protocolo");
  if (ctx.streakCurrent >= 3) unlocked.push("ofensiva-3");
  if (ctx.streakCurrent >= 7) unlocked.push("ofensiva-7");
  if (ctx.hasThreeStars) unlocked.push("estrela-perfeita");
  if (ctx.hasUsedPlayground) unlocked.push("explorador-playground");
  if (["silver", "gold", "platinum", "diamond"].includes(ctx.league)) unlocked.push("liga-prata");
  return unlocked;
}
