
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical Error: Root element #root not found in the DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("App failed to mount:", error);
    rootElement.innerHTML = `
      <div style="background: #050505; color: #ef4444; padding: 40px; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <h1 style="font-weight: 900; letter-spacing: -0.05em; margin-bottom: 10px;">STUDIO INITIALIZATION FAILED</h1>
        <p style="color: #71717a; max-width: 400px; margin-bottom: 20px;">The audio engine or UI failed to load. Check the browser console for specific error logs.</p>
        <button onclick="window.location.reload()" style="background: #ffffff; color: #000000; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer;">RETRY CONNECTION</button>
      </div>
    `;
  }
}
