import type { AppDefinition, CoreAppId } from '../domain'

export const appCatalog = [
  { name: 'Trilhas Dojo', category: 'Aprender', concepts: ['progressão', 'prática deliberada'], status: 'disponivel', appId: 'dojo' },
  { name: 'Terminal', category: 'Sistema', concepts: ['shell', 'processos'], status: 'disponivel', appId: 'terminal' },
  { name: 'Arquivos', category: 'Sistema', concepts: ['sistema de arquivos', 'árvores'], status: 'disponivel', appId: 'files' },
  { name: 'Mapa da Arquitetura', category: 'Desenvolver', concepts: ['camadas', 'contratos'], status: 'disponivel', appId: 'architecture' },
  { name: 'Central de Apps', category: 'Sistema', concepts: ['pacotes', 'dependências'], status: 'disponivel', appId: 'software' },
  { name: 'Engine Hub', category: 'Sistema', concepts: ['motores', 'adapters'], status: 'disponivel', appId: 'engines' },
  { name: 'Fundamentos', category: 'Aprender', concepts: ['computação', 'modelos mentais'], status: 'laboratorio' },
  { name: 'Mentor IA', category: 'Aprender', concepts: ['tutoria contextual', 'feedback'], status: 'laboratorio' },
  { name: 'Projetos', category: 'Aprender', concepts: ['aprendizagem ativa', 'portfólio'], status: 'laboratorio' },
  { name: 'Editor de Código', category: 'Desenvolver', concepts: ['linguagens', 'AST'], status: 'laboratorio' },
  { name: 'Monitor do Sistema', category: 'Sistema', concepts: ['telemetria', 'recursos'], status: 'laboratorio' },
] as const satisfies readonly AppDefinition[]

export const appTitles: Readonly<Record<CoreAppId, string>> = {
  dojo: 'Trilhas Dojo',
  terminal: 'Terminal',
  files: 'Arquivos',
  architecture: 'Mapa da Arquitetura',
  software: 'Central de Apps',
  engines: 'Engine Hub',
}
