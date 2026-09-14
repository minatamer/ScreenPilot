type DemoStageHeadingProps = Readonly<{
  pretitle: string;
  title: string;
  titleId?: string;
}>;

export function DemoStageHeading({
  pretitle,
  title,
  titleId,
}: DemoStageHeadingProps) {
  return (
    <div className="sp-demo-stage__heading">
      <p className="sp-eyebrow">{pretitle}</p>
      <h1 id={titleId}>{title}</h1>
    </div>
  );
}
