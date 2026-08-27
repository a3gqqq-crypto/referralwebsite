import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env.local file."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      /*
       * Keep the user's login session saved
       * in the browser.
       */
      persistSession: true,

      /*
       * Automatically refresh the session
       * when necessary.
       */
      autoRefreshToken: true,

      /*
       * Store the session in localStorage
       * so closing/reopening the website
       * does not log the user out.
       */
      storage: window.localStorage,

      /*
       * Useful for auth redirects if we add
       * them later.
       */
      detectSessionInUrl: true,
    },
  }
);