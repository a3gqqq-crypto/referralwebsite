import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { STAFF_LABEL, loadStaff } from "../data/staff";

// Lets staff hide their public Owner/Admin tag. Renders nothing for everyone else.
function StaffTagToggle() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    supabase.rpc("my_staff_status").then(({ data }) => {
      if (!cancelled) setStatus(data?.[0] || null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const label = STAFF_LABEL[status.role];
  const showing = !status.hide_tag;

  const toggle = async () => {
    setBusy(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("set_staff_tag_hidden", { p_hidden: showing });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setStatus({ ...status, hide_tag: showing });
      await loadStaff({ force: true });
    }

    setBusy(false);
  };

  return (
    <div className="staff-toggle card">
      <div>
        <strong>Show my {label} tag</strong>
        <p>
          {showing
            ? `Everyone sees the ${label} tag next to your name.`
            : "Hidden. Nobody can tell you're staff. You keep all your admin access."}
        </p>
        {error && <p className="staff-toggle-error">{error}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={showing}
        aria-label={`Show my ${label} tag`}
        className={`switch ${showing ? "on" : ""}`}
        onClick={toggle}
        disabled={busy}
      >
        <span />
      </button>
    </div>
  );
}

export default StaffTagToggle;
