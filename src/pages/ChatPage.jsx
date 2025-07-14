import { useState, useEffect, useRef } from 'react';
import SearchBar from '../components/SearchBar';
import ChatSidebar from '../components/ChatSidebar';
import Spinner from '../components/Spinner';
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../supabaseClient'
import { getPreviousChats } from '../utilities/GetMessages'
import { get_entity_image } from '../utilities/get_entity_image';

//The Chat Page is the main use feature of the app. PM can ask the chat questions about properties, units, or tenants. It has access to all leasing data applied to those properties.
const ChatPage = () => {
    //The entity sets the chatpage up to know what type of data to reference
    const [entity_id, setEntityId] = useState('');
    const [entity_type, setEntityType] = useState('');
    const [entitySelected, setSelectedEntity] = useState(false);
    const [entity_image, setEntityImage] = useState('');
    const [entity_name, setEntityName] = useState('')

    //The message variables store what is sent to chatGPT
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    //Sessions are message threads. They store different message history throughout the PM's time
    const [session_id, setSessionId] = useState(null); // initially null
    const [sessionReady, setSessionReady] = useState(false);

    //previous chats is a list of previous chats or sessions used for the UI only
    const [previousChats, setPreviousChats] = useState([]);

    //The Sources variables store what source is being called upon for the current message
    const [currentSources, setSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const messagesEndRef = useRef(null);

    const server_url = import.meta.env.VITE_SERVER_URL;


    //Temporary hardcoded user access_token that refreshes every hour
    const { session, loading, userData, loadingUserData } = useAuth();
    const access_token = session?.access_token;
    const auth_id = session?.user.id;

    const company_id = userData?.company_id


    // Load messages from localStorage on first mount. Only used when page is refreshed. W
    useEffect(() => {
        const init = async () => {
            const storedSessionId = localStorage.getItem("chat_session_id");
            const storedEntityId = localStorage.getItem("entity_id");
            const storedEntityType = localStorage.getItem("entity_type");
            const storedEntitySelected = localStorage.getItem("entity_selected");

            let newSessionId;

            // ✅ If we're resuming a specific session (via loadChat or reload)
            if (storedSessionId && storedEntityId && storedEntityType && storedEntitySelected === "true") {
                setEntityId(storedEntityId);
                setEntityType(storedEntityType);
                setSelectedEntity(true);
                await getPreviousChats(storedEntityId, session, setPreviousChats);

                await getEntityNameImage(storedEntityType, storedEntityId);

                newSessionId = storedSessionId;
            } else {
                // 🆕 New session (e.g. typed /chat directly or via link without preloaded context)
                newSessionId = crypto.randomUUID();

                // Clear any leftover context just to be safe
                localStorage.removeItem("chat_session_id");
                localStorage.removeItem("entity_id");
                localStorage.removeItem("entity_type");
                localStorage.removeItem("entity_selected");
                localStorage.removeItem("image_file_path");
            }

            localStorage.setItem("chat_session_id", newSessionId);
            setSessionId(newSessionId);
            setSessionReady(true);
        };

        init();
    }, []);

    //Gets messages from local storage or supabase if the session is loaded (page refreshed or old session selected)
    useEffect(() => {
        if (!sessionReady || !session_id) return;

        const cached = localStorage.getItem(`chat_thread_${session_id}`);
        if (cached) {
            try {
                //parses messages to appear in chronological order
                const parsed = JSON.parse(cached);
                const normalized = parsed.map((msg) => ({
                    ...msg,
                    message: msg.message || msg.text,
                    role: msg.role
                }));
                //sets page messages to parsed data
                setMessages(normalized);
            } catch (err) {
                console.warn("Failed to parse cached messages:", err);
            }
        } else {
            //is localStorage for session is empty loads session from supabase
            getMessages(session_id).then((msgs) => {
                if (msgs && msgs.length > 0) {
                    setMessages(msgs);
                }
            })
            // clear if no messages for this session
        }
    }, [session_id, sessionReady]);



    // Cache messages whenever they change. 
    useEffect(() => {
        if (messages.length > 0) {
            try {
                //Trims messages if too long
                const trimmedMessages = messages.slice(-50)
                    .map(({ message, text, role }) => ({
                        message: message || text,
                        role,
                    }));
                //Stores messages, entity, session id when messages change on page
                localStorage.setItem("chat_session_id", session_id);
                localStorage.setItem(`chat_thread_${session_id}`, JSON.stringify(trimmedMessages));
                localStorage.setItem(`entity_id`, entity_id);
                localStorage.setItem('entity_type', entity_type);
                localStorage.setItem('entity_selected', true);
            }
            catch (Error) {
                console.log("Set localstorage error", Error)
            }
        }
    }, [messages, session_id]);

    // Auto-scroll to bottom on message update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    //Gets messages from supabase based on sessionId
    const getMessages = async (sessionId) => {
        //Gets directly from supabase table. The messages for the session in order of creation. Newest at bottom
        //TODO set up RLS security for table
        const { data, error } = await supabase.from('entity_questions').select("*").eq('session_id', sessionId).order('created_at', { ascending: true });
        if (error) {
            console.error('Failed to fetch messages', await supabase_messages.text());
            return [];
        }

        return data


    }
    const getEntityNameImage = async (storedEntityType, storedEntityId) => {
        let columnName
        let tableName
        let Uid
        let file_path
        switch (storedEntityType) {
            case 'unit':
                columnName = 'address'
                tableName = 'Units'
                Uid = 'unit_id'
                file_path = 'photo_file_path'
                break;
            case 'tenant':
                columnName = 'Tenant_Name'
                tableName = 'tenant'
                Uid = 'tenant_id'
                file_path = 'photo_file_path'
                break;
            case 'property':
                columnName = 'Property_Name'
                tableName = 'properties'
                Uid = 'prop_id'
                file_path = 'photo_file_path'
                break;
            default:
                columnName = ''
                tableName = ''
                Uid = ''
                file_path = ''
        }
        if (columnName === '') return;
        const { data, error } = await supabase.from(tableName).select('*').eq(Uid, storedEntityId).single();
        if (error || !data) {
            console.error("Failed to fetch entity Info:", error);
            return
        }
        setEntityName(data[columnName])
        console.log(entity_name)
        localStorage.setItem('entity_name', data[columnName]);

        const imageurl = await get_entity_image(data[file_path], session);
        console.log(imageurl)
        setEntityImage(imageurl)

    }
    //Once an entity is selected from the search bar. Clears old entity data and replaces it with new in local storage
    const selectEntity = async (entityId, entityType) => {
        localStorage.removeItem('chat_session_id');
        localStorage.removeItem('entity_id');
        localStorage.removeItem('entity_type');
        localStorage.removeItem(`chat_thread_${session_id}`);

        localStorage.setItem('entity_id', entityId);
        localStorage.setItem('entity_type', entityType);
        localStorage.setItem('entity_selected', true)
        //Creates new session id for entity
        const newId = crypto.randomUUID();
        setSessionId(newId);
        localStorage.setItem('chat_session_id', newId)
        //Sets Entity Local Variables to be used by page
        setEntityId(entityId);
        setEntityType(entityType);
        setSelectedEntity(true);
        getEntityNameImage(entityType, entityId)
        //Calls Get Previous Chats for entity
        getPreviousChats(entityId, session, setPreviousChats);
    }
    //This function handles the logic when a message is sent for an entity
    const handleSend = async () => {
        //Makes sure message is trimmed before sending
        if (!input.trim()) return;

        //Sets new messages while using previous messages
        //Adds loading message for ai 
        setMessages((prev) => [
            ...prev,
            { role: 'user', text: input },
            { role: 'assistant', text: '...', loading: true }
        ]);
        //Sets the message input to blank
        setInput('');
        console.log(entity_id);
        console.log(entity_type);
        console.log("Company Id:", company_id)
        //Creates the json payload for the Server
        const payload = {
            entity_id: entity_id,
            company_id: company_id,
            message: input,
            session_id,
            auth_id: auth_id,
            entity_type: entity_type
        };

        try {
            //Contacts Servert to post message and run entire server script
            const res = await fetch(`${server_url}/entity_questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                },
                body: JSON.stringify(payload)
            });
            //Checks that response was ok
            if (!res.ok) {
                const error = await res.json();
                console.error("Server Error:", error);
                setMessages(prev => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', text: '⚠️ An error occurred. Please try again.' }
                ]);
                return;
            }
            //Gets all session messages from supabase
            const data = await getMessages(session_id);
            //Gets Sources that chatGPT used for messages
            const newSource = data[data.length - 1].sources;
            //Sets messages to supabase get call
            setMessages(data);
            if (newSource != null) {
                setSources(newSource);
                console.log(currentSources);
            }

        } catch (err) {
            console.error("Message Send Failed", err);
        }
    };
    if (loading) return <div>Loading...</div>
    if (loadingUserData) return <div>Loading...</div>
    if (!userData) return <div>User record not found</div>
    return (
        <div className="flex h-screen bg-[#1e1e1e]">
            {/* Left: main chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header: entity info + search bar */}
                <div className="flex items-center justify-between px-6 h-20 border-b border-gray-700">
                    {/* Left: Image and label */}
                    <div className="flex items-center space-x-3">
                        {entitySelected && entity_name !== '' && (
                            <div className="flex items-center space-x-2">
                                <img
                                    src={entity_image || ''}
                                    alt="Profile"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                />
                                <p className="text-white font-medium">
                                    {entity_name.charAt(0).toUpperCase() + entity_name.slice(1)} - {entity_type.charAt(0).toUpperCase() + entity_type.slice(1)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right: SearchBar */}
                    <div className="w-full max-w-lg">
                        <SearchBar
                            placeholder="Search Entities"
                            access_token={access_token}
                            selectEntity={(entityId, entityType) => {
                                selectEntity(entityId, entityType);
                            }}
                            type="units_properties_tenants"
                            entityDisplay={true}
                        />
                    </div>
                </div>

                {/* Chat message history */}
                <div className="flex-1 overflow-y-auto p-6 ml-6 mr-6 rounded-half space-y-4 bg-lease-gradient">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-3xl px-4 py-3 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#343541] text-white' : 'bg-[#444654] text-white'
                                    }`}
                            >
                                {msg.loading ? (
                                    <div className="text-white">
                                        <Spinner />
                                    </div>
                                ) : (
                                    <p>{msg.message || msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-4 border-t border-gray-700">
                    {entitySelected && (
                        <div className="bg-[#343541] max-w-3xl rounded-xl px-4 py-3 shadow-md w-full mx-auto">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                                className="flex items-center"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="flex-1 bg-transparent text-white outline-none placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    className="ml-3 text-white px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Sidebar */}
            <ChatSidebar
                previousChats={previousChats}
                sources={currentSources}
                onSelectChat={async (sessionId) => {
                    setSessionId(sessionId);
                    localStorage.setItem('chat_session_id', sessionId);
                    const oldmessages = await getMessages(sessionId);
                    setMessages(oldmessages);
                }}
                onSourceClick={(source) => {
                    setSelectedSource(source);
                    setShowModal(true);
                }}
            />

            {/* Source modal */}
            {showModal && selectedSource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
                        <button
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
                            onClick={() => setShowModal(false)}
                        >
                            &times;
                        </button>
                        <h2 className="text-lg font-semibold mb-2">Document Excerpt</h2>
                        <p className="mb-4 whitespace-pre-wrap text-gray-800">{selectedSource.highlight_text}</p>
                        <iframe
                            src={selectedSource.viewer_url}
                            title="Document Viewer"
                            className="w-full h-[500px] border"
                        ></iframe>
                    </div>
                </div>
            )}
        </div>


    );
};

export default ChatPage;
