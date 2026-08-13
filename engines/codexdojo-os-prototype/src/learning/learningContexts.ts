import type { CoreAppId, LearningContext } from '../domain'

export const coreContexts: Readonly<Record<CoreAppId, LearningContext>> = {
  dojo: {
    eyebrow: 'Sistema de aprendizagem',
    title: 'Como uma trilha vira competência',
    summary: 'Cada nó combina explicação curta, prática real dentro do desktop e uma evidência verificável do que foi aprendido.',
    concepts: [
      { name: 'Scaffolding', detail: 'A dificuldade cresce aos poucos e reaproveita conceitos anteriores.' },
      { name: 'Mastery learning', detail: 'O avanço depende de domínio demonstrado, não só de assistir conteúdo.' },
    ],
    challenge: 'Complete a ação guiada no Terminal e explique por que ela cria um processo.',
  },
  terminal: {
    eyebrow: 'Fundamento em contexto',
    title: 'Shell, comandos e processos',
    summary: 'O terminal interpreta texto, encontra um programa e pede ao sistema operacional para executá-lo como processo.',
    concepts: [
      { name: 'Processo', detail: 'Uma instância de programa em execução, com memória, estado e identificador próprios.' },
      { name: 'Entrada e saída', detail: 'Comandos leem dados de stdin e escrevem em stdout ou stderr.' },
    ],
    challenge: 'Digite “learn process” para abrir uma microlição no próprio terminal.',
  },
  files: {
    eyebrow: 'Fundamento em contexto',
    title: 'O sistema de arquivos é uma árvore',
    summary: 'Pastas organizam nomes e referências. O caminho registra como navegar da raiz até um recurso.',
    concepts: [
      { name: 'Hierarquia', detail: 'Diretórios formam uma árvore com relações de pai e filho.' },
      { name: 'Persistência', detail: 'Arquivos mantêm dados além da vida de um processo.' },
    ],
    challenge: 'Abra “Projetos” e identifique o caminho absoluto exibido na barra.',
  },
  architecture: {
    eyebrow: 'Decisão de arquitetura',
    title: 'Separar plataforma, apps e aprendizagem',
    summary: 'Contratos estáveis permitem desenvolver dezenas de apps sem acoplar janela, persistência, telemetria e conteúdo pedagógico.',
    concepts: [
      { name: 'Baixo acoplamento', detail: 'Um app depende de interfaces da plataforma, não da implementação interna.' },
      { name: 'Eventos', detail: 'Ações do usuário geram sinais consumidos pelo motor pedagógico.' },
    ],
    challenge: 'Abra uma camada e descreva qual contrato ela oferece para a camada acima.',
  },
  software: {
    eyebrow: 'Fundamento em contexto',
    title: 'Pacotes e dependências',
    summary: 'Um aplicativo é instalado com uma versão, metadados e uma lista explícita do que precisa para funcionar.',
    concepts: [
      { name: 'Grafo de dependências', detail: 'Apps e bibliotecas formam nós conectados por requisitos de versão.' },
      { name: 'Estado transacional', detail: 'Instalar deve concluir por inteiro ou voltar ao estado anterior.' },
    ],
    challenge: 'Instale um laboratório e observe a mudança de estado sem recarregar a interface.',
  },
  engines: {
    eyebrow: 'Ecossistema integrado',
    title: 'Um contrato por motor',
    summary: 'O Engine Hub mantém cada motor no runtime que lhe pertence e oferece uma superfície comum sem copiar estado ou fingir execução.',
    concepts: [
      { name: 'Adapter', detail: 'Traduz uma capacidade de um motor para o contrato seguro do desktop.' },
      { name: 'Autoridade', detail: 'A interface pode produzir ações e evidências, mas nunca decide domínio.' },
    ],
    challenge: 'Abra um motor e identifique qual ação real comprova que ele está utilizável.',
  },
}
