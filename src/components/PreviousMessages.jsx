// src/components/LoadPreviousMessages.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPreviousChats, getCompanyPreviousChats } from "../utilities/GetMessages";
import DisplayBox from "./DisplayBox";

const LoadPreviousMessages = ({
  entityId,
  session,
  entityType,
  className = "",
  listHeight, // if provided, forces a fixed height (e.g., "h-[60dvh]")
  listMinHeight = "min-h-0",            // legacy (kept)
  listMaxHeight = "max-h-[62dvh]",      // cap when we need scrolling
  autoSize = true,                      // NEW: auto height for short lists
  maxRowsBeforeScroll = 8,              // NEW: threshold before we cap/scroll
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
    return () => { cancelled = true; };
  }, [entityId, session, entityType]);

  const loadChat = (chat) => {
    if (!chat?.session_id) return;
    localStorage.setItem("chat_session_id", chat.session_id);
    localStorage.setItem("entity_id", entityId);
    console.log(entityType)
    localStorage.setItem("entity_type", entityType);
    localStorage.setItem("entity_selected", "true");
    localStorage.setItem('isOldMessage', "true")
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
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return null; }
  };

  // Decide scroll area sizing classes
  const listSizing = useMemo(() => {
    if (listHeight) return `overflow-y-auto ${listHeight}`;

    if (autoSize) {
      const fewItems = previousChats.length <= maxRowsBeforeScroll;
      // For short lists: natural height (no forced min/max height, no flex growth)
      // For long lists: cap with max height and enable scrolling
      return fewItems
        ? `overflow-visible h-auto`
        : `overflow-y-auto ${listMaxHeight} ${listMinHeight}`;
    }

    // Fallback legacy behavior (flex fill with cap)
    return `overflow-y-auto flex-1 min-h-0 ${listMinHeight} ${listMaxHeight}`;
  }, [listHeight, autoSize, previousChats.length, maxRowsBeforeScroll, listMaxHeight, listMinHeight]);

  return (
    <DisplayBox className={`w-full ${className}`}>
      <section className="bg-lease-gradient text-white p-5 sm:p-6 rounded-xl w-full">
        {/* Header */}
        <div className="flex items-center justify-center pb-4 sm:pb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-center" aria-label="Previous Messages list">
            Previous Messages
          </h1>
        </div>

        {/* Body */}
        {isLoading ? (
          <p className="text-sm text-gray-200/90">Loading…</p>
        ) : previousChats.length === 0 ? (
          <p className="text-sm text-gray-200/90">No Previous Chats</p>
        ) : (
          <div className="rounded-lg ring-1 ring-white/10 p-1">
            <ul className={`space-y-2 pr-1 ${listSizing}`}>
              {previousChats.map((chat, idx) => {
                const title = chat?.title || `Chat ${idx + 1}`;
                const when = formatWhen(chat);
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
      </section>
    </DisplayBox>
  );
};

export default LoadPreviousMessages;
