type StageIndicatorProps = Readonly<{
  currentIndex: number;
  label?: string;
  stages: readonly string[];
}>;

export function StageIndicator({
  currentIndex,
  label = "Interview progress",
  stages,
}: StageIndicatorProps) {
  const normalizedCurrentIndex = Number.isFinite(currentIndex)
    ? Math.trunc(currentIndex)
    : 0;
  const safeCurrentIndex = Math.min(
    Math.max(normalizedCurrentIndex, 0),
    Math.max(stages.length - 1, 0),
  );
  const currentStage = stages[safeCurrentIndex] ?? "Current step";

  return (
    <div aria-label={label} className="sp-stage-indicator" role="group">
      <span className="sp-stage-indicator__summary">
        Step {safeCurrentIndex + 1} of {stages.length} · {currentStage}
      </span>
      <ol>
        {stages.map((stage, index) => {
          const state =
            index < safeCurrentIndex
              ? "complete"
              : index === safeCurrentIndex
                ? "current"
                : "upcoming";

          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              data-state={state}
              key={`${String(index)}:${stage}`}
            >
              <span aria-hidden="true" className="sp-stage-indicator__marker" />
              <span className="sp-stage-indicator__label">{stage}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
