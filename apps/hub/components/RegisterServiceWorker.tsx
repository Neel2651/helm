'use client';

import { useEffect } from 'react';

// Registers the service worker so browsers offer "Add to Home Screen" / "Install app".
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
