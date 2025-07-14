import React from 'react';

//Hosts the Sidebar in the chat window with sources and previous chats
const ChatSidebar = ({ previousChats = [], sources = [], onSelectChat, onSourceClick }) => {

    
    return (
    <div className="w-80 bg-[#2c2c2e] text-white flex flex-col p-4 border-r border-gray-700 overflow-y-auto">
      {/*Sources Tab of Sidebar */}
      <h2 className="text-lg font-semibold mb-2">Sources</h2>
      <ul className="text-sm space-y-1">
        {sources.length === 0 ? (
          <li className="text-gray-400">No sources available</li>
        ) : (
          sources.map((source, idx) => (
            <li key={idx} className="text-sm border-l-4 pl-2 border-blue-500">
                <button 
                onClick={() => onSourceClick(source)}
                className='text-left text-blue-500 hover:underline w-full'>
                    Page {source.pageNumber}: {truncateText(source.highlight_text, 80)}
                </button>
            </li>
          ))
        )}
      </ul>
      {/* Previous Chats of Sidebar */}
      <h2 className="text-lg font-semibold mb-4">Previous Chats</h2>
      <ul className="space-y-2 mb-6">
        {previousChats.map((chat, idx) => (
          <li
            key={idx}
            className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded"
            onClick={() => onSelectChat(chat.session_id)}
          >
            {chat.title || `Chat ${idx + 1}`}
          </li>
        ))}
      </ul>
    </div>
  );
};
//shortens text for sidebar to limit size
const truncateText = (text, length) =>
    text.length > length ? text.substring(0, length) + "...": text;

export default ChatSidebar;


