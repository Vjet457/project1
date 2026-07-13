import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24 }}>
      <h1>AarogyaSaathi</h1>
      <p>The backend API is running and the application is ready for deployment.</p>
      <p>Use the Render-provided URL to access the deployed service.</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
