import { useMemo } from "react";

import { SHAPE_PATHS, decorationsFor, templateById } from "../data/momentTemplates";

export function MomentArt({ template, className = "" }) {
  const shapes = useMemo(() => decorationsFor(template), [template]);
  const gradientId = `moment-bg-${template.id}`;

  return (
    <svg className={`moment-art ${className}`} viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={template.bg[0]} />
          <stop offset="1" stopColor={template.bg[1]} />
        </linearGradient>
      </defs>

      <rect width="100" height="125" fill={`url(#${gradientId})`} />

      {shapes.map((shape, index) => (
        <path
          key={index}
          d={SHAPE_PATHS[shape.kind]}
          transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotate}) scale(${shape.size})`}
          fill={shape.kind === "bubble" ? "none" : shape.color}
          stroke={shape.kind === "bubble" ? shape.color : "none"}
          strokeWidth={shape.kind === "bubble" ? 0.09 : 0}
          opacity={shape.opacity}
        />
      ))}
    </svg>
  );
}

function sizeClass(message = "") {
  if (message.length > 320) return "is-long";
  if (message.length > 160) return "is-medium";
  return "";
}

function MomentCard({ templateId, to, message, from, large = false }) {
  const template = templateById(templateId);

  return (
    <article
      className={`moment-card ${large ? "moment-card-large" : ""} ${template.dark ? "is-dark" : ""}`}
      style={{ "--m-ink": template.ink, "--m-accent": template.accent }}
    >
      <MomentArt template={template} />

      <div className="moment-card-body">
        <div className="moment-card-top">
          <span className="moment-card-icon" aria-hidden="true">{template.icon}</span>
          <span className="moment-card-label">{template.label}</span>
        </div>

        <h2 className="moment-card-to">
          For <span>{to || "someone special"}</span>
        </h2>

        <p className={`moment-card-message ${sizeClass(message)}`}>
          {message || "Your message shows up here, exactly like this."}
        </p>

        <p className="moment-card-from">— {from || "you"}</p>
      </div>

      <span className="moment-card-stamp">made on Suffrova</span>
    </article>
  );
}

export default MomentCard;
