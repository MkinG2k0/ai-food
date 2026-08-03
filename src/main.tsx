import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/index';
import './app/styles/global.css';

defineCustomElements(window);
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
