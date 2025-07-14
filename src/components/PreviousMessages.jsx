// src/components/LoadPreviousMessages.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreviousChats } from '../utilities/GetMessages';
import DisplayBox from './DisplayBox';

/**
 * LoadPreviousMessages
 * Displays a list of previous chat sessions for a given entity.
 *
 * Props:
 * - entityId: ID of the selected tenant/property/unit
 * - session: Supabase session object
 * - entityType: type of entity ('tenant', 'property', etc.)
 * - className: optional additional CSS classes for styling
 */
const LoadPreviousMessages = ({ entityId, session, entityType, className = '' }) => {
  const [previousChats, setPreviousChats] = useState([]);
  const navigation = useNavigate();

  // Fetch previous chats when entityId or session changes
  useEffect(() => {
    if (!entityId || !session) return;

    const getChats = async () => {
      await getPreviousChats(entityId, session, setPreviousChats);
    };

    getChats();
  }, [entityId, session]);

  // Load a selected chat by saving info to localStorage and navigating
  const loadChat = (chat) => {
    console.log(entityId, entityType);

    // Store session info in localStorage for retrieval on /chat page
    localStorage.setItem('chat_session_id', chat.session_id);
    localStorage.setItem('entity_id', entityId);
    localStorage.setItem('entity_type', entityType);
    localStorage.setItem('entity_selected', 'true');

    // Optionally clear cached chat data
    localStorage.removeItem(`chat_thread_${chat.session_id}`);

    // Navigate to the chat page
    navigation('/chat');
  };

  return (
    <DisplayBox className={`flex flex-col ${className}`}>
      <div>
        <h1 className="font-bold text-2xl text-center mb-4">Previous Messages</h1>

        {previousChats.length === 0 ? (
          <div className="text-sm text-gray-400 self-start">No Previous Chats</div>
        ) : (
          <div className="flex flex-col space-y-2 overflow-y-auto self-start">
            {previousChats.map((chat, inx) => (
              <button
                key={inx}
                className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                onClick={() => loadChat(chat)}
              >
                {chat.title || `Chat ${inx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </DisplayBox>
  );
};

export default LoadPreviousMessages;
