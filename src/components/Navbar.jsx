import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Navbar({ user, onLogout }) {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const loadUsername = async () => {
      if (!user?.id) {
        setUsername("");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Could not load username:", error);

        setUsername(
          user?.user_metadata?.username ||
          "Member"
        );

        return;
      }

      setUsername(data?.username || "Member");
    };

    loadUsername();
  }, [user]);

  return (
    <nav className="navbar">

      <div className="logo">
        <span className="logo-icon">
          R
        </span>

        <span>
          REFERRAL
        </span>
      </div>

      <div className="nav-right">

        <span className="nav-status">
          <span className="status-dot"></span>
          Live
        </span>

        <button
          className="profile-button"
          type="button"
          onClick={onLogout}
          title="Click to log out"
        >
          {username || "Member"}
        </button>

      </div>

    </nav>
  );
}

export default Navbar;