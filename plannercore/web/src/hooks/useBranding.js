import { useState, useEffect, useCallback } from 'react';

// Modul-Level-Cache für schnellen Initial-Render
let cached = null;

// Initial-Werte aus __APP_CONFIG__ (server-injected) oder Fallback
function getInitial() {
  if (cached) return cached;
  const injected = window.__APP_CONFIG__?.branding;
  const defaults = {
    companyName: 'Tsunami Events',
    brandName: 'Planner',
    sidebarLogo: '/logos/plannercore_white_side.svg',
    loginLogo: '/logos/plannercore_white_side.svg',
    faviconPath: '/logos/plannercore_favicon.svg',
    logoSizeSidebar: 100,
    logoSizeLogin: 100,
  };
  cached = { ...defaults, ...injected };
  return cached;
}

export default function useBranding() {
  const [branding, setBranding] = useState(getInitial);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/branding', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        cached = data;
        setBranding(data);
        // Favicon dynamisch aktualisieren
        if (data.faviconPath) {
          const link = document.querySelector('link[rel="icon"]');
          if (link) link.href = data.faviconPath;
        }
      }
    } catch {
      // Ignore poll errors
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  return branding;
}
