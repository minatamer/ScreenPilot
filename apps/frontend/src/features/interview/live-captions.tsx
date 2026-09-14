import type { LiveCaption } from "./normalize-voice-event";

type LiveCaptionsProps = Readonly<{
  caption: LiveCaption | null;
}>;

export function LiveCaptions({ caption }: LiveCaptionsProps) {
  const speaker =
    caption?.speaker === "candidate" ? "You" : caption ? "Pilot" : "Captions";

  return (
    <section
      aria-atomic="true"
      aria-live={caption?.stability === "final" ? "polite" : "off"}
      className="sp-live-captions"
      data-stability={caption?.stability ?? "empty"}
    >
      <div className="sp-live-captions__label">
        <span aria-hidden="true" />
        <strong>{speaker}</strong>
        {caption?.stability === "tentative" ? <small>Listening…</small> : null}
      </div>
      <p>
        {caption?.text ??
          "Live captions will appear here when the conversation begins."}
      </p>
      <small>Final captions become local review evidence in this tab.</small>
    </section>
  );
}
