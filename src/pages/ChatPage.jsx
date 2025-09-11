// src/pages/ChatPage.jsx
import { useEffect, useRef, useState, memo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import ChatSidebar from "../components/ChatSidebar";
import Spinner from "../components/Spinner";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import { getPreviousChats, getLeaseDocs } from "../utilities/GetMessages";
import { get_entity_image } from "../utilities/get_entity_image";
import PopUp from "../components/popUp";

/* ---------- stable, memoized input to avoid remounts on re-render ---------- */
const ComposerInput = memo(function ComposerInput({
  value,
  onChange,
  inputRef,
  placeholder = "Ask a question…",
  disabled = false,
  onBlur,
  onFocus,
  ...rest
}) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window);

  return (
    <input
      id="ll-composer"
      name="ll-composer"
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
      // mobile friendliness
      inputMode="text"
      enterKeyHint="send"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      // More careful blur/focus handling for mobile
      onBlur={(e) => {
        // Only trigger blur handler if it's an actual user action, not programmatic
        if (e.relatedTarget || !isMobile) {
          onBlur?.(e);
        }
      }}
      onFocus={(e) => {
        onFocus?.(e);
      }}
      // keep DOM stable
      aria-label="Message"
      disabled={disabled}
      {...rest}
    />
  );
});

function textToBool(str) {
  if (typeof str !== "string") return Boolean(str);
  return str.trim().toLowerCase() === "true";
}

const ChatPage = () => {
  // ------------------------- entity context -------------------------
  const [entity_id, setEntityId] = useState("");
  const [entity_type, setEntityType] = useState("");
  const [entitySelected, setSelectedEntity] = useState(false);
  const [entity_image, setEntityImage] = useState("");
  const [entity_name, setEntityName] = useState("");

  // ------------------------- chat state ----------------------------
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // sessions
  const [session_id, setSessionId] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  // sidebar + resources
  const [previousChats, setPreviousChats] = useState([]);
  const [currentSources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // lease terms quick-view
  const [terms, setTerms] = useState([]);
  const [popUp, setPopUp] = useState(false);

  // refs
  const messagesEndRef = useRef(null);
  const composerInputRef = useRef(null);
  const isInitializedRef = useRef(false);
  const isMobileRef = useRef(false);

  // env + auth
  const server_url = import.meta.env.VITE_SERVER_URL;
  const { session, loading, userData, loadingUserData } = useAuth();
  const access_token = session?.access_token;
  const auth_id = session?.user?.id;
  const company_id = localStorage.getItem("activeCompanyId");

  // router
  const location = useLocation();

  // ------------------------- mobile detection -------------------------
  useEffect(() => {
    isMobileRef.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         ('ontouchstart' in window) || 
                         (window.innerWidth <= 768);
  }, []);

  // ------------------------- detect if this is a page refresh ----------
  const [isPageRefresh, setIsPageRefresh] = useState(false);
  const isOldMessage = textToBool(localStorage.getItem("isOldMessage"));

  // Resolve refresh state once after mount
  useEffect(() => {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    const isReload =
      nav?.type === "reload" || performance.navigation?.type === 1; // legacy
    setIsPageRefresh(Boolean(isReload));
  }, []);

  // ------------------------- initialize chat session ------------------
  useEffect(() => {
    if (isPageRefresh === null || !session) return;
    if (isInitializedRef.current) return;

    const init = async () => {
      const shouldRestore = isPageRefresh || isOldMessage;

      if (shouldRestore) {
        const storedSessionId = localStorage.getItem("chat_session_id");
        const storedEntityId = localStorage.getItem("entity_id");
        const storedEntityType = localStorage.getItem("entity_type");
        const storedEntitySelected = localStorage.getItem("entity_selected");

        if (
          storedSessionId &&
          storedEntityId &&
          storedEntityType &&
          storedEntitySelected === "true"
        ) {
          setEntityId(storedEntityId);
          setEntityType(storedEntityType);
          setSelectedEntity(true);

          await getPreviousChats(storedEntityId, session, setPreviousChats);
          await getEntityNameImage(storedEntityType, storedEntityId);
          setSessionId(storedSessionId);

          const cached = localStorage.getItem(`chat_thread_${storedSessionId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              const normalized = parsed.map((msg) => ({
                ...msg,
                message: msg.message || msg.text,
                role: msg.role,
              }));
              setMessages(normalized);
            } catch (err) {
              console.warn("Failed to parse cached messages:", err);
            }
          } else {
            const { data: stored, error: msgErr } = await supabase
              .from("entity_questions")
              .select("*")
              .eq("session_id", storedSessionId);
            if (msgErr) {
              console.error("Error Fetching Messages", msgErr);
            } else if (stored) {
              const messages = stored.map((msg) => ({
                ...msg,
                message: msg.message,
                role: msg.role,
              }));
              setMessages(messages);
            }
          }
          setSessionReady(true);
          return;
        }
      }

      // fresh navigation → create new session
      const newId = crypto.randomUUID();
      setSessionId(newId);
      localStorage.setItem("chat_session_id", newId);

      // clear thread + entity context
      setMessages([]);
      setSources([]);
      setSelectedSource(null);
      setSelectedEntity(false);
      setEntityId("");
      setEntityType("");

      if (!isPageRefresh) {
        localStorage.removeItem("entity_id");
        localStorage.removeItem("entity_type");
        localStorage.removeItem("entity_selected");
        localStorage.removeItem("image_file_path");
      }

      setSessionReady(true);
    };

    init().finally(() => {
      isInitializedRef.current = true;
    });
  }, [isPageRefresh, session]);

  // ------------------------- persist messages ----------------------
  useEffect(() => {
    if (!session_id) return;
    try {
      const trimmed = messages.slice(-50).map(({ message, text, role }) => ({
        message: message || text,
        role,
      }));
      localStorage.setItem("chat_session_id", session_id);
      localStorage.setItem(`chat_thread_${session_id}`, JSON.stringify(trimmed));
      if (entity_id) localStorage.setItem("entity_id", entity_id);
      if (entity_type) localStorage.setItem("entity_type", entity_type);
      localStorage.setItem("entity_selected", String(!!entitySelected));
    } catch (err) {
      console.log("Set localStorage error", err);
    }
  }, [messages, session_id, entity_id, entity_type, entitySelected]);

  // ------------------------- autoscroll (skip if typing) -----------
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (
      composerInputRef.current &&
      document.activeElement === composerInputRef.current
    )
      return;
    messagesEndRef.current.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [messages]);

  // ------------------------- focus preservation / armor (desktop only) -------------
  const preserveFocusRef = useRef(false);
  const [userIntentBlur, setUserIntentBlur] = useState(false);

  const handleInputChange = useCallback((e) => {
    // Don't mess with focus preservation on mobile during typing
    if (!isMobileRef.current && composerInputRef.current) {
      preserveFocusRef.current =
        document.activeElement === composerInputRef.current;
    }
    setInput(e.target.value);
  }, []);

  // Restore focus after state updates when blur was not intentional (desktop only)
  useEffect(() => {
    // Skip focus restoration on mobile to prevent keyboard issues
    if (isMobileRef.current) return;
    
    if (
      !userIntentBlur &&
      preserveFocusRef.current &&
      composerInputRef.current &&
      entitySelected &&
      !showModal &&
      !sidebarOpen
    ) {
      preserveFocusRef.current = false;
      // Use longer timeout and check if element still exists
      const timer = setTimeout(() => {
        if (
          composerInputRef.current &&
          document.activeElement !== composerInputRef.current &&
          document.contains(composerInputRef.current)
        ) {
          composerInputRef.current.focus({ preventScroll: true });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [input, entitySelected, showModal, sidebarOpen, userIntentBlur]);

  // Focus composer when entity is selected (less aggressive on mobile)
  useEffect(() => {
    if (entitySelected && !showModal && !sidebarOpen && !isMobileRef.current) {
      const timer = setTimeout(() => {
        composerInputRef.current?.focus({ preventScroll: true });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [entitySelected, showModal, sidebarOpen]);

  // ------------------------- fetch tenant terms --------------------
  useEffect(() => {
    if (entity_type !== "tenant" || !entity_id) return;
    let cancelled = false;
    (async () => {
      try {
        const leases = await getLeaseDocs(entity_id);
        if (!cancelled) setTerms(leases?.basic_lease ?? []);
      } catch (_e) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [entity_type, entity_id]);

  // ------------------------- data helpers --------------------------
  const getMessages = async (sessionId) => {
    const { data, error } = await supabase
      .from("entity_questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages", error);
      return [];
    }
    return data;
  };

  const getEntityNameImage = async (storedEntityType, storedEntityId) => {
    let columnName = "";
    let tableName = "";
    let Uid = "";
    let file_path = "";

    switch (storedEntityType) {
      case "unit":
        columnName = "address";
        tableName = "Units";
        Uid = "unit_id";
        file_path = "photo_file_path";
        break;
      case "tenant":
        columnName = "Tenant_Name";
        tableName = "tenant";
        Uid = "tenant_id";
        file_path = "photo_file_path";
        break;
      case "property":
        columnName = "Property_Name";
        tableName = "properties";
        Uid = "prop_id";
        file_path = "photo_file_path";
        break;
      default:
        return;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq(Uid, storedEntityId)
      .single();
    if (error || !data) {
      console.error("Failed to fetch entity Info:", error);
      return;
    }

    setEntityName(data[columnName] ?? "");
    localStorage.setItem("entity_name", data[columnName] ?? "");

    try {
      const imageurl = await get_entity_image(data[file_path], session);
      setEntityImage(imageurl);
    } catch (_e) {
      setEntityImage("");
    }

    if (storedEntityType === "tenant") {
      const ready = String(data.Available).toLowerCase() === "true";
      setPopUp(!ready);
    }
  };

  // Make selectEntity STABLE so Header/SearchBar don't re-render every keystroke
  const selectEntity = useCallback(
    async (entityId, entityType) => {
      // fully reset thread state
      setMessages([]);
      setSources([]);
      setSelectedSource(null);
      setShowModal(false);

      if (session_id) localStorage.removeItem(`chat_thread_${session_id}`);
      localStorage.removeItem("chat_session_id");
      localStorage.removeItem("entity_id");
      localStorage.removeItem("entity_type");

      setPopUp(false);

      const newId = crypto.randomUUID();
      setSessionId(newId);
      localStorage.setItem("chat_session_id", newId);

      setEntityId(entityId);
      setEntityType(entityType);
      setSelectedEntity(true);
      await getEntityNameImage(entityType, entityId);

      getPreviousChats(entityId, session, setPreviousChats);

      // Focus after entity selection (only on desktop)
      if (!isMobileRef.current) {
        setTimeout(() => {
          composerInputRef.current?.focus({ preventScroll: true });
        }, 200);
      }
    },
    [session, session_id] // minimal deps; other setters are stable
  );

  const pollForNextAssistantResponse = async (
    existingAssistantCount,
    retries = 20,
    delay = 3000
  ) => {
    for (let i = 0; i < retries; i++) {
      const msgs = await getMessages(session_id);
      const newAssistantMessages = msgs.filter((m) => m.role === "assistant");

      if (newAssistantMessages.length > existingAssistantCount) {
        setMessages(msgs);
        const last = msgs[msgs.length - 1];
        if (last?.sources) setSources(last.sources);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    setMessages((prev) => [
      ...prev.slice(0, -1),
      { role: "assistant", text: "⚠️ No response received. Please try again later." },
    ]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: "...", loading: true },
    ]);
    setInput("");

    const payload = {
      entity_id,
      company_id,
      message: trimmed,
      session_id,
      auth_id,
      entity_type,
    };

    try {
      const res = await fetch(`${server_url}/entity_questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error("Server Error:", error);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", text: "⚠️ An error occurred. Please try again." },
        ]);
        return;
      }

      const current = await getMessages(session_id);
      const assistantCount = current.filter((m) => m.role === "assistant").length;
      pollForNextAssistantResponse(assistantCount);
    } catch (err) {
      console.error("Message Send Failed", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", text: "⚠️ Network error. Please try again." },
      ]);
    } finally {
      // Don't re-focus after sending on mobile - let user decide
      if (!isMobileRef.current) {
        setTimeout(() => {
          composerInputRef.current?.focus({ preventScroll: true });
        }, 100);
      }
    }
  };

  // ------------------------- render helpers ------------------------
  const Header = memo(function Header() {
    return (
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#121212]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121212]/70 min-h-14">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-6">
          {/* Entity label */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3">
            {entitySelected && entity_name && (
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                {entity_image && (
                  <img
                    src={entity_image}
                    alt="Entity"
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-none rounded-full object-cover ring-1 ring-white/10"
                  />
                )}
                <p className="truncate text-xs sm:text-sm font-medium text-white/90">
                  <span className="hidden sm:inline">
                    {entity_name.charAt(0).toUpperCase() + entity_name.slice(1)}{" "}
                    -{" "}
                  </span>
                  <span className="text-white/60">
                    {entity_type.charAt(0).toUpperCase() + entity_type.slice(1)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Search (shrinks on mobile) */}
          <div className="w-full max-w-xs sm:max-w-lg flex-1">
            <SearchBar
              placeholder="Search Entities"
              access_token={access_token}
              selectEntity={selectEntity}
              type="tenants"
              entityDisplay={true}
              noAutoFocus={true}
              data-no-autofocus
            />
          </div>

          {/* Sidebar toggle on mobile */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex-none inline-flex items-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white/80 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20 lg:hidden"
            aria-label="Open chat sidebar"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="hidden sm:inline">Sources</span>
            <span className="sm:hidden">•••</span>
          </button>
        </div>
      </div>
    );
  });

  const Composer = () => (
    <div className="z-10 px-2 sm:px-4 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        {entitySelected ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 rounded-2xl bg-[#2b2e3a]/95 px-3 py-2 ring-1 ring-inset ring-white/10 shadow-lg backdrop-blur"
          >
            <ComposerInput
              inputRef={composerInputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question…"
              onBlur={() => setUserIntentBlur(true)}
              onFocus={() => setUserIntentBlur(false)}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:bg-blue-600/50 disabled:cursor-not-allowed transition-colors"
              onMouseDown={(e) => e.preventDefault()}
            >
              Send
            </button>
          </form>
        ) : (
          <p className="rounded-xl bg-[#2b2e3a]/60 px-3 py-2 text-center text-sm text-white/70 ring-1 ring-inset ring-white/10">
            Select a property, unit, or tenant to start chatting.
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400 text-center">
          LeaseLink can make mistakes — be sure to check original sources.
        </p>
      </div>
    </div>
  );

  const ChatBubble = ({ role, text, loading }) => (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-full max-w-[85%] sm:max-w-3xl whitespace-pre-wrap rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed shadow-sm ring-1 ring-inset ring-white/10 ${
          role === "user" ? "bg-[#2f3241] text-white" : "bg-[#3a3d4a] text-white"
        }`}
      >
        {loading ? (
          <div className="text-white">
            <Spinner />
          </div>
        ) : (
          <p className="break-words">{text}</p>
        )}
      </div>
    </div>
  );

  // ------------------------- main render ---------------------------
  if (loading || loadingUserData) return <div className="p-6 text-white">Loading…</div>;
  if (!userData) return <div className="p-6 text-white">User record not found</div>;

  return (
    <div className="flex h-[100dvh] md:h-screen min-h-0 flex-col bg-[#1b1b1b] text-white overflow-hidden">
      <Header />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: main column */}
        <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 pb-28 sm:pb-32">
            <div className="mx-auto w-full max-w-4xl space-y-3 sm:space-y-4">
              {messages.map((m, i) => (
                <ChatBubble
                  key={i}
                  role={m.role}
                  text={m.message || m.text}
                  loading={m.loading}
                />
              ))}
              <div ref={messagesEndRef} />
              <div className="h-2 sm:h-3" />
              <Composer />
            </div>
          </div>
        </div>

        {/* RIGHT: desktop sidebar */}
        <div className="hidden w-[370px] flex-none border-l border-white/10 lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatSidebar
              previousChats={previousChats}
              sources={currentSources}
              onSelectChat={async (sid) => {
                setSessionId(sid);
                localStorage.setItem("chat_session_id", sid);
                const oldmessages = await getMessages(sid);
                setMessages(oldmessages);
              }}
              onSourceClick={(source) => {
                setSelectedSource(source);
                setShowModal(true);
              }}
              termsRent={terms}
            />
          </div>
        </div>
      </div>

      {/* Sidebar Drawer (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col bg-[#111215] ring-1 ring-white/10">
            <div className="lex items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <h2 className="text-sm font-semibold">History & Sources</h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-white/80 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20"
                aria-label="Close sidebar"
                onMouseDown={(e) => e.preventDefault()}
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatSidebar
                previousChats={previousChats}
                sources={currentSources}
                onSelectChat={async (sid) => {
                  setSessionId(sid);
                  localStorage.setItem("chat_session_id", sid);
                  const oldmessages = await getMessages(sid);
                  setMessages(oldmessages);
                  setSidebarOpen(false);
                }}
                onSourceClick={(source) => {
                  setSelectedSource(source);
                  setShowModal(true);
                  setSidebarOpen(false);
                }}
                termsRent={terms}
              />
            </div>
          </div>
        </div>
      )}

      {/* Source modal */}
      {showModal && selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="relative w-full max-w-6xl h-[90vh] my-6 sm:my-10 overflow-hidden rounded-2xl bg-white text-black shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 flex-none">
              <h2 className="text-base sm:text-lg font-semibold truncate pr-4">
                Document Excerpt
              </h2>
              <button
                className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedSource.highlight_text && (
                <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto max-h-[25%]">
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                    {selectedSource.highlight_text}
                  </p>
                </div>
              )}
              <div className="flex-1 px-4 sm:px-6 pb-4">
                <div className="w-full h-full overflow-hidden rounded-md border">
                  <iframe
                    src={selectedSource.viewer_url}
                    title="Document Viewer"
                    className="w-full h-full"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {popUp && (
        <PopUp
          title={`${entity_name} Not Updated`}
          message={`${entity_name} may not have accurate context. Documents are still uploading.`}
          onClose={() => setPopUp(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;