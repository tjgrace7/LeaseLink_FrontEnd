import React from "react";

/**
 * ChatSidebar
 * - Shows:
 *   1) Sources list (with clickable highlights)
 *   2) Optional "Terms and Rent" section
 *   3) Previous Chats list
 *
 * Props:
 * - previousChats: [{ session_id, title }]
 * - sources: [{ pageNumber, highlight_text }]
 * - termsRent: [{ [label]: value }]
 * - onSelectChat: function(session_id)
 * - onSourceClick: function(source)
 */
const ChatSidebar = ({
  previousChats = [],
  sources = [],
  onSelectChat,
  onSourceClick,
  termsRent = [],
}) => {
  return (
    <aside className="w-full min-w-[16rem] bg-[#2c2c2e] text-white flex flex-col p-4 border-r border-gray-700 overflow-y-auto">
      {/* Sources */}
      <SectionTitle>Sources</SectionTitle>
      <ul className="text-sm space-y-1 mb-6">
        {sources.length === 0 ? (
          <li className="text-gray-400">No sources available</li>
        ) : (
          sources.map((source, idx) => (
            <li
              key={`source-${idx}`}
              className="text-sm border-l-4 pl-2 border-blue-500"
            >
              <button
                onClick={() => onSourceClick?.(source)}
                className="text-left text-blue-500 hover:underline w-full break-words"
              >
                Page {source.pageNumber}:{" "}
                {truncateText(source.highlight_text, 80)}
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Terms & Rent */}
      {termsRent.length > 0 && (
        <div className="mb-6">
          <SectionTitle>Terms and Rent</SectionTitle>
          <ul className="space-y-2">
            {termsRent.map((item, index) => {
              const entries = Object.entries(item || {});
              if (entries.length === 0) return null;

              const [key, value] = entries[0];
              if (!value || value === "N/A") return null;

              return (
                <li key={`term-${index}`} className="text-sm flex flex-wrap">
                  <span className="mr-2 font-medium">{key}:</span>
                  <span>{value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Previous Chats */}
      <SectionTitle>Previous Chats</SectionTitle>
      <ul className="space-y-2">
        {previousChats.length === 0 ? (
          <li className="text-gray-400 text-sm">No previous chats</li>
        ) : (
          previousChats.map((chat, idx) => (
            <li
              key={`chat-${chat.session_id || idx}`}
              className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-sm truncate"
              onClick={() => onSelectChat?.(chat.session_id)}
              title={chat.title || `Chat ${idx + 1}`}
            >
              {chat.title || `Chat ${idx + 1}`}
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};

/** Simple section heading */
const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-semibold mb-2">{children}</h2>
);

/** Truncate text safely */
const truncateText = (text, length) => {
  if (!text) return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
};

export default ChatSidebar;