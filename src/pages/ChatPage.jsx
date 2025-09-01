// src/pages/ChatPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "../components/SearchBar";
import ChatSidebar from "../components/ChatSidebar";
import Spinner from "../components/Spinner";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import { getPreviousChats, getLeaseDocs } from "../utilities/GetMessages";
import { get_entity_image } from "../utilities/get_entity_image";
import PopUp from "../components/popUp";

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

  // env + auth
  const server_url = import.meta.env.VITE_SERVER_URL;
  const { session, loading, userData, loadingUserData } = useAuth();
  const access_token = session?.access_token;
  const auth_id = session?.user.id;
  const company_id = userData?.company_id;

  // ------------------------- detect touch (mobile/tablet) ----------
  const isTouch = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  }, []);

  // ------------------------- initial hydrate -----------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const storedSessionId = localStorage.getItem("chat_session_id");
      const storedEntityId = localStorage.getItem("entity_id");
      const storedEntityType = localStorage.getItem("entity_type");
      const storedEntitySelected = localStorage.getItem("entity_selected");

      let newSessionId;

      if (
        storedSessionId &&
        storedEntityId &&
        storedEntityType &&
        storedEntitySelected === "true"
      ) {
        if (cancelled) return;
        setEntityId(storedEntityId);
        setEntityType(storedEntityType);
        setSelectedEntity(true);
        await getPreviousChats(storedEntityId, session, setPreviousChats);
        await getEntityNameImage(storedEntityType, storedEntityId);
        newSessionId = storedSessionId;
      } else {
        newSessionId = crypto.randomUUID();
        localStorage.removeItem("chat_session_id");
        localStorage.removeItem("entity_id");
        localStorage.removeItem("entity_type");
        localStorage.removeItem("entity_selected");
        localStorage.removeItem("image_file_path");
      }

      localStorage.setItem("chat_session_id", newSessionId);
      if (!cancelled) {
        setSessionId(newSessionId);
        setSessionReady(true);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // ------------------------- load existing thread ------------------
  useEffect(() => {
    if (!sessionReady || !session_id) return;

    const cached = localStorage.getItem(`chat_thread_${session_id}`);
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
      getMessages(session_id).then((msgs) => {
        if (msgs && msgs.length > 0) setMessages(msgs);
      });
    }
  }, [sessionReady, session_id]);

  // ------------------------- persist messages ----------------------
  useEffect(() => {
    if (messages.length > 0 && session_id) {
      try {
        const trimmed = messages
          .slice(-50)
          .map(({ message, text, role }) => ({ message: message || text, role }));
        localStorage.setItem("chat_session_id", session_id);
        localStorage.setItem(`chat_thread_${session_id}`, JSON.stringify(trimmed));
        if (entity_id) localStorage.setItem("entity_id", entity_id);
        if (entity_type) localStorage.setItem("entity_type", entity_type);
        localStorage.setItem("entity_selected", String(!!entitySelected));
      } catch (err) {
        console.log("Set localStorage error", err);
      }
    }
  }, [messages, session_id, entity_id, entity_type, entitySelected]);

  // ------------------------- autoscroll (skip if typing) -----------
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (composerInputRef.current && document.activeElement === composerInputRef.current) return;
    messagesEndRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  // ------------------------- keep composer focused while typing ----
  // If something else steals focus during a re-render (e.g., SearchBar),
  // immediately restore focus to the chat composer while the user is typing.
  useEffect(() => {
    if (!composerInputRef.current) return;
    if (showModal || sidebarOpen) return; // don't steal focus from overlays
    // Only run this effect in response to *chat input* changes
    requestAnimationFrame(() => {
      if (document.activeElement !== composerInputRef.current) {
        try {
          composerInputRef.current.focus({ preventScroll: true });
        } catch {}
      }
    });
  }, [input, showModal, sidebarOpen]);

  // Focus the composer when an entity is selected for the first time
  useEffect(() => {
    if (entitySelected && composerInputRef.current && !showModal && !sidebarOpen) {
      requestAnimationFrame(() => {
        try {
          composerInputRef.current.focus({ preventScroll: true });
        } catch {}
      });
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
      } catch (_e) {
        // ignore
      }
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

  const selectEntity = async (entityId, entityType) => {
    setMessages([]);
    setSources([]);
    setSelectedSource(null);
    setShowModal(false);
    localStorage.removeItem("chat_session_id");
    localStorage.removeItem("entity_id");
    localStorage.removeItem("entity_type");
    if (session_id) localStorage.removeItem(`chat_thread_${session_id}`);
    setPopUp(false);

    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem("chat_session_id", newId);

    setEntityId(entityId);
    setEntityType(entityType);
    setSelectedEntity(true);
    await getEntityNameImage(entityType, entityId);

    getPreviousChats(entityId, session, setPreviousChats);

    if (isTouch) setTimeout(() => composerInputRef.current?.focus(), 0);
  };

  const pollForNextAssistantResponse = async (
    existingAssistantCount,
    retries = 20,
    delay = 1500
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
      if (isTouch) setTimeout(() => composerInputRef.current?.focus(), 0);
    }
  };

  // ------------------------- render helpers ------------------------
  const Header = () => (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#121212]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121212]/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-6">
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
                  {entity_name.charAt(0).toUpperCase() + entity_name.slice(1)}{" "}-{" "}
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
            selectEntity={(id, type) => selectEntity(id, type)}
            type="tenants"
            entityDisplay={true}
            // Prevent any internal auto-focus behavior from stealing focus
            noAutoFocus
            data-no-autofocus
          />
        </div>

        {/* Sidebar toggle on mobile */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex-none inline-flex items-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white/80 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20 lg:hidden"
          aria-label="Open chat sidebar"
        >
          <span className="hidden sm:inline">Sources</span>
          <span className="sm:hidden">•••</span>
        </button>
      </div>
    </div>
  );

  const Composer = () => (
    <div className="sticky bottom-3 z-10 px-2 sm:px-4 md:px-6 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-4xl">
        {entitySelected ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 rounded-2xl bg-[#2b2e3a]/95 px-3 py-2 ring-1 ring-inset ring-white/10 shadow-lg backdrop-blur"
          >
            <input
              ref={composerInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
              inputMode="text"
              enterKeyHint="send"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:bg-blue-600/50 disabled:cursor-not-allowed transition-colors"
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
    // Column: sticky header on top; content row underneath
    // Lock page height; children manage scroll. dvh helps iOS Safari.
    <div className="flex h-[100dvh] md:h-screen min-h-0 flex-col bg-[#1b1b1b] text-white overflow-hidden">
      {/* GLOBAL HEADER: spans both columns and stays visible while scrolling */}
      <Header />

      {/* CONTENT ROW under header: left = messages, right = desktop sidebar */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: main column (its own scroll area) */}
        <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
          {/* Scrollable area for messages */}
          {/* Add bottom padding so last message never hides under the sticky composer */}
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
            </div>
          </div>

          {/* Sticky composer at bottom of the LEFT scroll container */}
          <Composer />
        </div>

        {/* RIGHT: desktop sidebar (independent scroll) */}
        <div className="hidden w-[370px] flex-none border-l border-white/10 lg:flex">
          {/* Make the sidebar its own scroll area */}
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

      {/* Sidebar Drawer (mobile) - overlays content, not under header */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col bg-[#111215] ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <h2 className="text-sm font-semibold">History & Sources</h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-white/80 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20"
                aria-label="Close sidebar"
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
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl bg-white text-black shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold truncate pr-4">Document Excerpt</h2>
              <button
                className="flex-none rounded-md p-1 text-2xl leading-none text-gray-500 hover:text-black hover:bg-gray-100"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3 sm:px-6 sm:py-4" style={{ maxHeight: "calc(95vh - 80px)" }}>
              <p className="mb-4 whitespace-pre-wrap text-sm sm:text-base text-gray-800 break-words">
                {selectedSource.highlight_text}
              </p>
              <div className="w-full overflow-hidden rounded-md border">
                <iframe
                  src={selectedSource.viewer_url}
                  title="Document Viewer"
                  className="w-full h-[50vh] sm:h-[60vh]"
                  loading="lazy"
                />
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
