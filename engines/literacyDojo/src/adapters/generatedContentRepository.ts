import type { ContentRepository } from "../application/ports";
import {
  type LessonDefinition,
  type ModuleDefinition,
  type SkillDefinition,
  type Track,
  contentVersion,
  lessons,
  modules,
  skills,
  track,
} from "../data/generated/lessons";

/**
 * Adapter de conteúdo do MVP: lê somente o read model gerado
 * (src/data/generated/lessons.ts — DO NOT EDIT BY HAND). Nenhum componente
 * importa o read model diretamente; tudo passa por esta porta.
 */
export class GeneratedContentRepository implements ContentRepository {
  getTrack(): Track {
    return track;
  }

  listModules(): ModuleDefinition[] {
    return [...modules].sort((a, b) => a.order - b.order);
  }

  listSkills(): SkillDefinition[] {
    return skills;
  }

  listLessons(): LessonDefinition[] {
    return lessons;
  }

  getLesson(lessonId: string): LessonDefinition | undefined {
    return lessons.find((lesson) => lesson.id === lessonId);
  }

  getSkillTitle(skillId: string): string {
    return skills.find((skill) => skill.id === skillId)?.title ?? skillId;
  }

  getContentVersion(): string {
    return contentVersion;
  }
}
