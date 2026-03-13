// src/components/ChatSidebar.jsx
// Desktop/drawer sidebar for the Chat page.
//
// Sections:
//   1) Sources     - Document highlights returned by the last AI response. For tenant
//                    entity types, each source is listed individually. For property entity
//                    types, sources are first grouped by tenant name so the user can see
//                    which documents belong to which tenant.
//   2) Email Sources - Emails returned as context by the AI; clicking one opens EmailModal.
//   3) Dates       - Quick-view of key lease dates extracted from the active tenant lease.
//   4) Previous Chats - Session list for the selected entity; clicking one restores the thread.
import React from "react";
/**
 * ChatSidebar
 * Props:
 * @param {Array}    previousChats  - [{ session_id, title }] list of past chat sessions.
 * @param {Array}    sources        - Document citation objects from the last AI response.
 * @param {Array}    termsRent      - [{ [label]: extractionObj }] lease date terms for the Dates section.
 * @param {Array}    emailSources   - Email objects returned as context by the AI.
 * @param {string}   entityType     - "tenant" | "property" — controls how sources are rendered.
 * @param {Function} onSelectChat   - (session_id) => void — called when a previous chat is clicked.
 * @param {Function} onSourceClick  - (source) => void — called when a document source is clicked.
 * @param {Function} onEmailClick   - (email) => void — called when an email source is clicked.
 */
const ChatSidebar = ({
  previousChats = [],
  sources = [],
  onSelectChat,
  onSourceClick,
  termsRent = [],
  emailSources = [],
  onEmailClick,
  entityType,
}) => {
  // Group document sources by tenant name when the entity type is "property" so the
  // sidebar can show a separate sub-list per tenant. For non-property types this is null.
  const sourcesByTenant = React.useMemo(() => {
    if (entityType !== 'property') return null;
    if (!Array.isArray(sources)) return {};

    return sources.reduce((acc, s) => {
      const name = s?.tenant_name || 'Unknown Tenant';
      (acc[name] ||= []).push(s);
      return acc;
    }, {});

  }, [sources, entityType]);
  const tenantNames = React.useMemo(() => {
    if (!sourcesByTenant) return [];
    return Object.keys(sourcesByTenant);
  }, [sourcesByTenant]);

  // Builds the human-readable label shown for each document source button.
  // For tenants: shows "Page N: <truncated highlight>" when page/highlight data is present,
  //              otherwise falls back to the filename from the source_doc path.
  // For properties: prepends the truncated filename to the page/highlight info.
  const getSourceText = (source) => {

    if (entityType === "tenant") {
      if (source.pageNumber && source.highlight_text && source.pageNumber > 0) {
        return `Page ${source.pageNumber}: ${truncateText(source.highlight_text, 80)}`;
      }
      else {
        const sourceName = source?.source_doc.split('/').pop();
        return `Document: ${sourceName ?? 'Unknown Document'}`;
      }
    } else if (entityType === "property" && source?.source_doc) {
      const sourceName = source?.source_doc.split('/').pop();
      if (source.pageNumber && source.highlight_text && source.pageNumber > 0) {
        return `${truncateText(sourceName, 30)}; Page ${source.pageNumber}: Highlight: ${truncateText(source.highlight_text, 80)}`;
      } else {
        const sourceName = source?.source_doc.split('/').pop();
        return `Document: ${sourceName ?? 'Unknown Document'}`;
      }
    }
  }
  return (
    <aside className="w-full min-w-[16rem] bg-[#2c2c2e] text-white flex flex-col p-4 border-r border-gray-700 overflow-y-auto">
      {/* Sources */}
      <SectionTitle>Sources</SectionTitle>
      <ul className="text-sm space-y-1 mb-6">
        {(!sources?.length && !emailSources?.length) ? (
          <li className="text-gray-400">Ask a Question for Sources</li>
        ) : (
          <>

            {entityType === 'tenant' && Array.isArray(sources) && sources?.map((source, idx) => (
              <li
                key={`doc-${source?.pageNumber + " " + idx ?? idx}`}
                className="text-sm border-l-4 pl-2 border-blue-500"
              >
                <button
                  onClick={() => onSourceClick?.(source)}
                  className="text-left text-blue-500 hover:underline w-full break-words"
                >
                  {getSourceText(source)}
                </button>
              </li>

            ))}
          </>
        )}
        {entityType === "property" && sources.length > 0 && (
            <>
              {tenantNames.map((tenantName) => (
                <li key={`tenant-${tenantName}`} className="mb-3">
                  {/* Tenant header */}
                  <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">
                    {tenantName}
                  </div>

                  <ul className="space-y-1">
                    {sourcesByTenant[tenantName].map((source, idx) => (
                      <li
                        key={`doc-${tenantName}-${source?.pageNumber ?? "nopage"}-${idx}`}
                        className="text-sm border-l-4 pl-2 border-blue-500"
                      >
                        <button
                          onClick={() => onSourceClick?.(source)}
                          className="text-left text-blue-500 hover:underline w-full break-words"
                        >
                          {getSourceText(source)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </>
          )}
        {Array.isArray(emailSources) && emailSources?.map((email, idx) => (
          <li
            key={`email-${email?.id ?? idx}`}
            className="text-sm border-l-4 pl-2 border-blue-500"
          >
            <button

              onClick={() => {
                onEmailClick?.(email)
              }}
              className="text-left text-blue-500 hover:underline w-full break-words"
            >
              Email Subject: {email?.subject ?? '(no subject)'}
            </button>
          </li>
        ))}

      </ul>

      {/* Terms & Rent */}
      {termsRent.length > 0 && (
        <div className="mb-6">
          <SectionTitle>Dates</SectionTitle>

          <ul className="space-y-2">
            {termsRent.map((item, index) => {
              const entries = Object.entries(item || {});
              if (!entries.length) return null;

              const [label, extraction] = entries[0];

              // ✅ get the actual string value
              const displayValue =
                extraction?.value ??
                extraction?.future_value ??
                "";

              if (!displayValue || displayValue === "N/A" || displayValue === "Null") return null;

              return (
                <li key={`term-${index}`} className="text-sm flex flex-wrap">
                  <span className="mr-2 font-medium">{label}:</span>
                  <span>{displayValue}</span>
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