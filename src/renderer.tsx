/**
 * Point d'entrée du processus de rendu (UI).
 * Chargé par Vite, exécuté dans le contexte "renderer" d'Electron.
 * Ne touche jamais la base : tout passe par l'API exposée par le preload (IPC).
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
      <Toaster position="top-center" />
    </TooltipProvider>
  </React.StrictMode>,
);
