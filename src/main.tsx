import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Redirect all relative /api calls to backend server
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = 'http://localhost:3000' + input;
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
