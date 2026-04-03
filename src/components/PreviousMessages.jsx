// src/components/PreviousMessages.jsx (LoadPreviousMessages)
// Displays a scrollable list of previous chat sessions for an entity or company.
// Clicking a chat row stores the session details in localStorage and navigates to /chat
// so ChatPage can restore the conversation thread.
//
// Props:
//   entityId   - ID of the entity (tenant, property, unit, or company) whose chats to load.
//   session    - Supabase auth session (passed to the fetch utilities).
//   entityType - "company" uses getCompanyPreviousChats; all others use getPreviousChats.
//   className  - Optional extra Tailwind classes for the outer wrapper.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPreviousChats, getCompanyPreviousChats } from "../utilities/GetMessages";
import DisplayBox from "./DisplayBox";

const LoadPreviousMessages = ({
  entityId,
  session,
  entityType,
  className = "",
}) => {
  const [previousChats, setPreviousChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!entityId || !session) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const fn = entityType === "company" ? getCompanyPreviousChats : getPreviousChats;
        await fn(entityId, session, (rows) => {
          if (!cancelled) setPreviousChats(Array.isArray(rows) ? rows : []);
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityId, session, entityType]);

  const loadChat = (chat) => {
    if (!chat?.session_id) return;

    localStorage.setItem("chat_session_id", chat.session_id);
    localStorage.setItem("entity_id", chat.entity_id);
    localStorage.setItem("entity_type", chat.entity);
    localStorage.setItem("entity_selected", "true");
    localStorage.setItem("isOldMessage", "true");

    if (chat.entity_name) localStorage.setItem("entity_name", chat.entity_name);
    localStorage.removeItem(`chat_thread_${chat.session_id}`);

    navigate("/chat");
  };

  const formatWhen = (chat) => {
    const iso = chat?.created_at || chat?.last_message_at;
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    // Critical: w-full h-full min-h-0 so parent height wins
    <div className={`w-full h-full min-h-0 ${className}`}>
      {previousChats.length > 0 ? (
        // Card takes full height, internal layout controls scroll area
        <section className="bg-lease-gradient text-white p-5 sm:p-6 rounded-xl w-full h-full min-h-0 flex flex-col">
          {/* Header (natural height) */}
          <div className="flex items-center justify-center pb-4 sm:pb-5 shrink-0">
            <h1
              className="text-2xl sm:text-3xl font-bold text-center"
              aria-label="Previous Messages list"
            >
              Previous Messages
            </h1>
          </div>

          {/* Body fills remaining height */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <p className="text-sm text-gray-200/90">Loading…</p>
            ) : (
              <div className="rounded-lg ring-1 ring-white/10 p-1 h-full min-h-0 flex flex-col">
                {/* This is the scroll container that respects parent height */}
                <ul className="space-y-2 pr-1 flex-1 min-h-0 overflow-y-auto">
                  {previousChats.map((chat, idx) => {
                    const title = chat?.title || `Chat ${idx + 1}`;
                    const when = formatWhen(chat);
                    const recentUser = chat?.recentUser

                    return (
                      <li key={chat.session_id || idx} className="last:mb-0">
                        <button
                          onClick={() => loadChat(chat)}
                          className="w-full text-left border border-white/20 hover:border-white/40 focus:border-white/60 transition-colors
                                   px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg bg-white/5 hover:bg-white/10"
                          title={title}
                          aria-label={`Open chat ${title}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                            <span className="font-medium text-base sm:text-lg leading-tight break-words">
                              {title}
                            </span>
                            <span className="text-xs sm:text-sm text-white/80">
                              {recentUser ? `Last message: ${recentUser}` : chat.session_id}
                            </span>
                            <span className="text-xs sm:text-sm text-white/80">
                              {when ? when : chat.session_id}
                            </span>

                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : (
        // Empty state also takes full height so it matches siblings
        <div className="w-full h-full min-h-0 rounded-2xl border border-white/10 bg-white/5 p-6 text-center flex flex-col items-center justify-center">
          <p className="text-base font-medium">No Messages Yet</p>
          <p className="text-sm opacity-70 mt-1">
            Click the Chat Button to Ask your first Question
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadPreviousMessages;
