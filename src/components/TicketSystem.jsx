import { useAuth, } from "./AuthProvider";
import { useState, useEffect, memo, useRef, useCallback } from 'react'
import { getLogs, getErrors, clearLogs } from "../utilities/logCollector";
import Spinner from "./loadingSpinner";
import { supabase } from "../supabaseClient";

const ChatBubble = memo(function ChatBubble({ message,  onClick, answered, ticketSubmit }) {
    const text = message.text || message.message;
    const role = message.role;
    const loading = message.loading || false;
    const [notAnswered, setNotAnswered] = useState(false);


    const links = Array.isArray(message.links)
        ? message.links
        : message.links
            ? [message.links]
            : [];



    const isUser = message.role === "user";

    return (
        <div className={`flex flex-col mt-4 mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={[
                    "w-full max-w-[85%] sm:max-w-3xl whitespace-pre-wrap rounded-2xl",
                    "px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed",
                    "shadow-sm ring-1 ring-inset ring-white/10",
                    isUser ? "bg-[#2f3241] text-white" : "bg-[#3a3d4a] text-white",
                    !loading && onClick ? "cursor-pointer hover:ring-white/20" : "",
                ].join(" ")}
            >
                {loading ? (
                    <div className="spinner">

                    </div>
                ) : (
                    <span className="break-words text-left block">
                        <div>
                            {text}
                            {(links || []).map((link, idx) => {
                                console.log("Processing link:", link);


                                return (
                                    <div key={idx}>
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="
    inline-flex items-center gap-2
    mt-2 px-3 py-2
    bg-blue-500/10 hover:bg-blue-500/20
    border border-blue-400/30
    text-blue-300
    rounded-lg
    transition
  "
                                        >
                                            📘 View Documentation - {link.pageName}
                                        </a>
                                    </div>
                                )
                            })}
                        </div></span>
                )}
            </div>
            {message.role === "assistant" && !loading &&(
                <div
                    className={[
                        "w-full max-w-[85%] sm:max-w-3xl whitespace-pre-wrap rounded-2xl",
                        "px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed",
                        "shadow-sm ring-1 ring-inset ring-white/10 mt-4",
                        isUser ? "bg-[#2f3241] text-white" : "bg-[#3a3d4a] text-white",
                        !loading && onClick ? "cursor-pointer hover:ring-white/20" : "",
                    ].join(" ")}
                >
                    <span className="break-words text-left block">
                        Did this Answer Your Question?
                        <div className="flex gap-4 mt-2">
                            <button
                                onClick={() => answered?.()}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setNotAnswered(true)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                            >
                                No
                            </button>
                        </div>
                    </span>
                </div>

            )}
            {notAnswered && (
                <div
                    className={[
                        "w-full max-w-[85%] sm:max-w-3xl whitespace-pre-wrap rounded-2xl",
                        "px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed",
                        "shadow-sm ring-1 ring-inset ring-white/10 mt-4",
                        isUser ? "bg-[#2f3241] text-white" : "bg-[#3a3d4a] text-white",
                        !loading && onClick ? "cursor-pointer hover:ring-white/20" : "",
                    ].join(" ")}
                >
                    <span className="break-words text-left block">
                        We're sorry to hear that. Ask a follow up question to get more help or click the button below to submit a support ticket.
                    </span>
                    <div className="flex gap-4 mt-2">
                        <button
                            onClick={() => ticketSubmit?.()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                            Submit Support Ticket
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
const ComposerInput = memo(function ComposerInput({
    value,
    onChange,
    inputRef,
    placeholder = "Ask a question…",
    disabled = false,
}) {
    return (
        <input
            id="ll-composer"
            name="ll-composer"
            ref={inputRef}
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
            // keep DOM stable
            aria-label="Message"
            disabled={disabled}
            style={{ WebkitUserSelect: 'text' }}
        />
    );
});
const Composer = memo(function Composer({ input, setInput, handleSend, composerInputRef }) {
    const handleChange = useCallback((e) => setInput(e.target.value), [setInput]);
    return (
        <div className="z-10 px-2 sm:px-4 md:px-6">
            <div className="mx-auto w-full max-w-4xl">

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="ios-allow-select flex gap-2 rounded-2xl bg-[#2b2e3a]/95 px-3 py-2 ring-1 ring-inset ring-white/10 shadow-lg"
                >
                    <ComposerInput
                        inputRef={composerInputRef}
                        value={input}
                        onChange={handleChange}
                        placeholder="Ask a question…"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="inline rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:bg-blue-600/50 disabled:cursor-not-allowed transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        Send
                    </button>
                </form>

            </div>
        </div>
    )
});

const TicketSystem = () => {
    const asanaaccess = import.meta.env.VITE_ASANA_ACCESS_TOKEN;
    const { userData, session } = useAuth();
    const [isOpen, setIsOpen] = useState(false)
    const [sessionId, setSessionId] = useState("");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const composerInputRef = useRef(null);

    //const server_url = "http://localhost:8000";
    const server_url = import.meta.env.VITE_SERVER_URL;


    useEffect(() => {
        let storedSessionId = localStorage.getItem("leaseLinkSessionId");
        if (!storedSessionId) {
            storedSessionId = crypto.randomUUID();
            localStorage.setItem("leaseLinkSessionId", storedSessionId);
        }
        setSessionId(storedSessionId);
    }, [isOpen]);

    useEffect(() => {
        if (!sessionId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase.from('Help_Chats').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
            if (error) {
                console.error("Error fetching chat messages:", error);
                return;
            }
            const msgs = data.map((msg) => ({
                role: msg.role,
                text: msg.message,

            }))
            setMessages(msgs);
        }
        fetchMessages();

    }, [sessionId]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        console.log("Session ID for ticket:", sessionId);
        setMessages((prev) => 
            [
                ...prev,
                { role: "user", text: trimmed },
                { role: "assistant", text: "...", loading: true },
            ]
        );
        console.log("Messages after user input:", messages);
        setInput("");

        const payload = {
            company_id: userData.company_id,
            message: trimmed,
            session_id: sessionId,
            auth_id: session.user.id,

        };

        try {
            const res = await fetch(`${server_url}/help`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
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

            const current = await getMessages();
            const assistantCount = current.filter((m) => m.role === "assistant").length;
            let delay = 3000;
            pollForNextAssistantResponse(assistantCount, 20, delay);


        } catch (err) {
            console.error("Message Send Failed", err);
            setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", text: "⚠️ Network error. Please try again." },
            ]);
        } finally {
            // Re-focus after sending
            setTimeout(() => {
                composerInputRef.current?.focus();
            }, 100);
        }
    }

    const getMessages = async () => {
        const { data, error } = await supabase
            .from("Help_Chats")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Failed to fetch messages", error);
            return [];
        }
        console.log("Fetched messages:", data);
        return data;
    };

    const pollForNextAssistantResponse = async (
        existingAssistantCount,
        retries = 20,
        delay = 5000
    ) => {
        for (let i = 0; i < retries; i++) {
            const msgs = await getMessages();
            const newAssistantMessages = msgs.filter((m) => m.role === "assistant");

            if (newAssistantMessages.length > existingAssistantCount) {
                setMessages(msgs);

                return;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", text: "⚠️ No response received. Please try again later." },
        ]);
    };
    const SubmitTicket = async (message) => {
        const today = new Date().toISOString().split("T")[0];
        const logs = getLogs();
        const errors = getErrors();

        const { data: Company, error: companyError } = await supabase
            .from('Property_Management_Companies')
            .select("*")
            .eq('company_id', userData.company_id)
            .single();

        if (companyError) {
            console.error("Error fetching company name:", companyError);
            return;
        }

        const taskName = `${userData.Name || userData.auth_id}  ${Company.company_name}  ${today}`;

        const notes = `User: ${userData.Name || 'Unknown'}
                    \nUser_Auth_Id: ${userData.auth_id}
                    \nCompany_Name: ${Company.company_name}
                    \nCompany_Id: ${userData.company_id}

                    \nUser's Input: ${message.map(m => `${m.role}: ${m.text || m.message}`).join("\n")}

                    \nConsole Errors:\n${errors}`;

        try {
            const response = await fetch('https://app.asana.com/api/1.0/tasks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${asanaaccess}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        'name': taskName,
                        'notes': notes,
                        'projects': ["1210831492845292"],
                        "due_on": today
                    }
                })
            });

            const task = await response.json();

            await fetch(`https://app.asana.com/api/1.0/sections/1210831492845293/addTask`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${asanaaccess}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        task: task.data.gid
                    }
                })
            });

            clearLogs();
        } catch (err) {
            console.error("Error submitting ticket:", err);
        }
    };

    const close = () => {
        localStorage.removeItem('leaseLinkSessionId');
        setMessages([]);
        setIsOpen(!isOpen)
    }
    return (
        // Hide on mobile (hidden md:block) and only show on medium screens and up
        <div className="hidden md:block fixed bottom-6 right-6 z-50">
            {/* Toggle button */}
            <button
                onClick={() => {
                    close();

                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg"
            >
                {isOpen ? 'Close' : 'Request Help'}
            </button>

            {/* Ticket form (basic example) */}
            {isOpen && (
                <div className="mt-2 p-4 w-80 bg-white text-black rounded shadow-xl gap-4 flex flex-col">
                    <h2 className="text-lg font-semibold mb-2">How can we help?</h2>
                    {/*Message Response Area*/}
                    <div className="overflow-y-auto max-h-[70vh] flex flex-col">
                        {(messages?.length ?? 0) > 0 ? messages.map((msg, idx) => (
                            <ChatBubble
                                key={idx}
                                message={msg}
                                answered={() => { close() }}
                                ticketSubmit={() => { SubmitTicket(messages); close() }}
                            />
                        )) : <p className="text-sm text-gray-500">No previous messages.</p>}


                    </div>
                    <Composer
                        input={input}
                        setInput={setInput}
                        handleSend={handleSend}
                        composerInputRef={composerInputRef}
                    />
                </div>
            )}
        </div>
    );
};

export default TicketSystem