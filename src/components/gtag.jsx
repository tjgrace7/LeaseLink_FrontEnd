/**
 * gtag.jsx — Google Tag Manager (GTM) dataLayer helpers
 *
 * Every function here pushes a custom event object onto `window.dataLayer`,
 * which GTM picks up and can forward to GA4, advertising pixels, etc.
 * The pattern is:  window.dataLayer = window.dataLayer || [];  (guards against
 * GTM not yet having initialised the array) then push an object with at minimum
 * an `event` key matching the GTM trigger name.
 *
 * Exports:
 *  GTMPageView    — React component: fires a "page_view" event on every route change
 *  GTMCreate      — Fires a custom create event with entity_type and entity_name
 *  GTMUpload      — Fires "Document_Uploaded"
 *  GTMChatEntity  — Fires "Chat Entity Selected" when the user picks an entity in chat
 *  GTMChat        — Fires "Chat Sent" when the user submits a chat message
 *  GTMChatResponse — Fires "Chat Response" with a success flag
 *  GTMSignIn      — Fires "Sign In" with a success flag
 *  GTMSignOut     — Fires "Sign Out"
 *  GTMLead        — Fires "qualify_lead" (conversion tracking)
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export const GTMPageView = () => {
  const location = useLocation();

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page_path: location.pathname,
    });
  }, [location.pathname]);

  return null;
}

export const GTMCreate = (event, entityType, entityName) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: event,
        entity_type: entityType, 
        entity_name: entityName
    })
}
export const GTMUpload = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'Document_Uploaded'
    })
}
export const GTMChatEntity = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'Chat Entity Selected'
    })
}
export const GTMChat = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'Chat Sent',
    })
}
export const GTMChatResponse = (successful) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'Chat Response',
        success: successful,
    })
}

export const GTMSignIn = (success) => {
    window.dataLayer = window.dataLayer ||[];
    window.dataLayer.push({
        event: 'Sign In',
        success: success
    })
}

export const GTMSignOut = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'Sign Out'
    })
}

export const GTMLead = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'qualify_lead',
    })
}