// src/components/LoadPreviousMessages.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreviousChats, getCompanyPreviousChats } from '../utilities/GetMessages';
import DisplayBox from './DisplayBox';

const LoadPreviousMessages = ({ entityId, session, entityType, className = '' }) => {
  const [previousChats, setPreviousChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!entityId || !session) return;
    let cancelled = false;

    const getChats = async () => {
      setIsLoading(true);
      try {
        if (entityType === 'company') {
          await getCompanyPreviousChats(entityId, session, (rows) => {
            if (!cancelled) setPreviousChats(Array.isArray(rows) ? rows : []);
          });
        } else {
          await getPreviousChats(entityId, session, (rows) => {
            if (!cancelled) setPreviousChats(Array.isArray(rows) ? rows : []);
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    getChats();
    return () => {
      cancelled = true;
    };
  }, [entityId, session, entityType]);

  const loadChat = (chat) => {
    if (!chat?.session_id) return;

    // Persist selection for ChatPage hydration
    localStorage.setItem('chat_session_id', chat.session_id);
    localStorage.setItem('entity_id', entityId);
    localStorage.setItem('entity_type', entityType);
    localStorage.setItem('entity_selected', 'true');

    // Optional: if your chat objects carry an entity name, store it for instant header paint
    if (chat.entity_name) {
      localStorage.setItem('entity_name', chat.entity_name);
    }

    // Clear cached thread for this session so /chat reloads fresh
    localStorage.removeItem(`chat_thread_${chat.session_id}`);

    navigate('/chat');
  };

  return (
    <DisplayBox className={`flex flex-col ${className}`}>
      <div>
        <h1 className="font-bold text-2xl text-center mb-4">Previous Messages</h1>

        {isLoading ? (
          <div className="text-sm text-gray-400 self-start">Loading…</div>
        ) : previousChats.length === 0 ? (
          <div className="text-sm text-gray-400 self-start">No Previous Chats</div>
        ) : (
          <div className="flex flex-col max-h-80 space-y-2 overflow-y-auto self-start">
            {previousChats.map((chat, idx) => (
              <button
                key={chat.session_id || idx}
                className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                onClick={() => loadChat(chat)}
                title={chat.title || chat.session_id}
              >
                {chat.title || `Chat ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </DisplayBox>
  );
};

export default LoadPreviousMessages;
