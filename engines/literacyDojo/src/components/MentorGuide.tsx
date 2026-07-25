import type { ReactNode } from "react";

type MentorGuideProps = {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  compact?: boolean;
  testId?: string;
};

export function MentorGuide({
  children,
  title = "Lumi, sua guia",
  eyebrow = "MENTORA DE APRENDIZAGEM",
  compact = false,
  testId,
}: MentorGuideProps) {
  return (
    <aside
      className={`mentor-guide${compact ? " mentor-guide-compact" : ""}`}
      data-testid={testId}
      aria-label={`${title}: ${eyebrow}`}
    >
      <div className="mentor-avatar" aria-hidden="true">
        <span className="mentor-antenna" />
        <span className="mentor-face">
          <span className="mentor-eyes" />
        </span>
        <span className="mentor-body" />
      </div>
      <div className="mentor-copy">
        <p className="mentor-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    </aside>
  );
}
