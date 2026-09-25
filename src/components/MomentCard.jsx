import { templateById } from "../data/momentTemplates";

function MomentCard({ templateId, to, message, from, large = false }) {
  const template = templateById(templateId);

  return (
    <article
      className={`moment-card ${large ? "moment-card-large" : ""}`}
      style={{ "--moment-color": template.color }}
    >
      <div className="moment-card-top">
        <span className="moment-card-icon" aria-hidden="true">
          {template.icon}
        </span>

        <span className="moment-card-label">{template.label}</span>
      </div>

      <h2 className="moment-card-to">
        For {to || "someone special"}
      </h2>

      <p className="moment-card-message">
        {message || "Your message shows up here, exactly like this."}
      </p>

      <p className="moment-card-from">— {from || "you"}</p>

      <span className="moment-card-stamp">made on Vexora</span>
    </article>
  );
}

export default MomentCard;
