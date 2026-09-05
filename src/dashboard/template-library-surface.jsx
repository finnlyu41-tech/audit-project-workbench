import React from "react";

// Focus a concrete saved/copy result without selecting or changing any template.
export function TemplateLibrarySurface({ children, reveal, onRevealed }) {
  const root = React.useRef(null);
  React.useEffect(() => {
    if (!reveal) return;
    const frame = window.requestAnimationFrame(() => {
      const card = [...(root.current?.querySelectorAll(".sample-library-card") || [])]
        .find((element) => element.dataset.templateId === reveal.id);
      if (card) {
        card.focus({ preventScroll: true });
        card.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      onRevealed();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reveal, onRevealed]);
  return <div className="template-library-surface" ref={root}>{children}</div>;
}
