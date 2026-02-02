console.log("🚀 [System] index.tsx: Entry point triggered");
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Signal to index.html that the module loaded correctly
(window as any).APP_STARTED = true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ [System] index.tsx: Could not find root element");
  throw new Error("Could not find root element to mount to");
}

console.log("✅ [System] index.tsx: Mounting React application");
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);