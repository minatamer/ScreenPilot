type DemoStageHeadingProps = Readonly<{
  pretitle: string;
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  titleId?: string;
}>;

export function DemoStageHeading({
  pretitle,
  step,
  title,
  titleId,
}: DemoStageHeadingProps) {
  return (
    <div className="sp-demo-stage__heading">
      <p className="sp-eyebrow">
        Step {step} of 5 · {pretitle}
      </p>
      <h1 id={titleId}>{title}</h1>
    </div>
  );
}
