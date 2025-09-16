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
