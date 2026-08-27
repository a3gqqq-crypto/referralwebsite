import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

const EventContext = createContext(null);

export function EventProvider({
  user,
  children,
}) {
  const [joinedEvents, setJoinedEvents] =
    useState({});
  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const storageKey = user?.id
    ? `vexora_joined_events_${user.id}`
    : null;

  /* =========================================
     LOAD SAVED EVENTS
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    const loadJoinedEvents = async () => {
      if (!user?.id) {
        setJoinedEvents({});
        setLoadingEvents(false);
        return;
      }

      setLoadingEvents(true);

      let savedEvents = {};

      /*
       * Load local backup first.
       */
      try {
        if (storageKey) {
          const saved =
            localStorage.getItem(storageKey);

          if (saved) {
            const parsed =
              JSON.parse(saved);

            if (
              parsed &&
              typeof parsed === "object"
            ) {
              savedEvents = parsed;
            }
          }
        }
      } catch (error) {
        console.error(
          "Could not read saved events:",
          error
        );
      }

      if (!cancelled) {
        setJoinedEvents(savedEvents);
      }

      /*
       * Then verify with Supabase.
       */
      const {
        data,
        error,
      } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq(
          "user_id",
          user.id
        );

      if (cancelled) {
        return;
      }

      if (!error && data) {
        const databaseEvents = {};

        data.forEach((row) => {
          databaseEvents[row.event_id] =
            true;
        });

        /*
         * Database + local backup.
         */
        const merged = {
          ...savedEvents,
          ...databaseEvents,
        };

        setJoinedEvents(merged);

        try {
          if (storageKey) {
            localStorage.setItem(
              storageKey,
              JSON.stringify(merged)
            );
          }
        } catch (storageError) {
          console.error(
            "Could not save joined events:",
            storageError
          );
        }
      } else if (error) {
        console.error(
          "Could not load event participation:",
          error
        );
      }

      setLoadingEvents(false);
    };

    loadJoinedEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.id, storageKey]);


  /* =========================================
     CHECK JOINED
  ========================================= */

  const isJoined = (eventId) => {
    return !!joinedEvents[eventId];
  };


  /* =========================================
     JOIN EVENT
  ========================================= */

  const joinEvent = async (eventId) => {
    if (!user?.id || !eventId) {
      return {
        success: false,
        error: "Missing user or event.",
      };
    }

    /*
     * Already joined locally.
     */
    if (isJoined(eventId)) {
      return {
        success: true,
        alreadyJoined: true,
      };
    }

    /*
     * Try to create the database row.
     */
    const {
      error,
    } = await supabase
      .from("event_participants")
      .insert({
        event_id: eventId,
        user_id: user.id,
      });

    /*
     * Duplicate = already joined.
     */
    if (
      error &&
      error.code !== "23505"
    ) {
      console.error(
        "Could not join event:",
        error
      );

      return {
        success: false,
        error:
          "Could not join the event. Please try again.",
      };
    }

    /*
     * Update the global state.
     */
    const updated = {
      ...joinedEvents,
      [eventId]: true,
    };

    setJoinedEvents(updated);

    /*
     * Persist it locally.
     */
    try {
      if (storageKey) {
        localStorage.setItem(
          storageKey,
          JSON.stringify(updated)
        );
      }
    } catch (storageError) {
      console.error(
        "Could not save joined event:",
        storageError
      );
    }

    return {
      success: true,
      alreadyJoined:
        error?.code === "23505",
    };
  };


  return (
    <EventContext.Provider
      value={{
        joinedEvents,
        isJoined,
        joinEvent,
        loadingEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}


export function useEvents() {
  const context =
    useContext(EventContext);

  if (!context) {
    throw new Error(
      "useEvents must be used inside EventProvider"
    );
  }

  return context;
}