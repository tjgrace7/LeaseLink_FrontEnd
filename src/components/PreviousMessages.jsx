// src/components/LoadPreviousMessages.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPreviousChats, getCompanyPreviousChats } from "../utilities/GetMessages";
import DisplayBox from "./DisplayBox";

const LoadPreviousMessages = ({ entityId, session, entityType, className = "" }) => {
  const [previousChats, setPreviousChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!entityId || !session) return;
    let cancelled = false;

    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const fn = entityType === "company" ? getCompanyPreviousChats : getPreviousChats;
        await fn(entityId, session, (rows) => {
          if (!cancelled) setPreviousChats(Array.isArray(rows) ? rows : []);
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchChats();
    return () => { cancelled = true; };
  }, [entityId, session, entityType]);

  const loadChat = (chat) => {
    if (!chat?.session_id) return;

    localStorage.setItem("chat_session_id", chat.session_id);
    localStorage.setItem("entity_id", entityId);
    localStorage.setItem("entity_type", entityType);
    localStorage.setItem("entity_selected", "true");
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
    <DisplayBox className={`text-white ${className}`}>
      <section className="bg-lease-gradient text-white p-4 sm:p-5 rounded-lg">
        {/* Header — centered title that reserves space */}
        <div className="grid grid-cols-3 items-center pb-4 mb-2">
          <div />{/* left spacer to visually center on desktop */}
          <h1
            className="text-xl sm:text-2xl font-bold text-center col-start-2"
            aria-label="Previous Messages list"
          >
            Previous Messages
          </h1>
          <div />{/* right spacer */}
        </div>

        {/* Body */}
        {isLoading ? (
          <p className="text-sm text-gray-300/90">Loading…</p>
        ) : previousChats.length === 0 ? (
          <p className="text-sm text-gray-300/90">No Previous Chats</p>
        ) : (
          <div className="rounded-lg ring-1 ring-white/10 p-1">
            <ul className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {previousChats.map((chat, idx) => {
                const title = chat?.title || `Chat ${idx + 1}`;
                const when = formatWhen(chat);
                return (
                  <li key={chat.session_id || idx} className="mb-2 last:mb-0">
                    <button
                      onClick={() => loadChat(chat)}
                      className="w-full text-left border border-gray-600 hover:border-gray-400 focus:border-gray-300 transition-colors px-3 sm:px-4 py-2 rounded-lg"
                      title={title}
                      aria-label={`Open chat ${title}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <span className="font-medium text-sm sm:text-base break-words">
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
