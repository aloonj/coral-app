import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { config } from './config';
import { ThemeProvider } from './theme/ThemeContext';

document.title = config.siteName;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
