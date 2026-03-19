import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import './index.css'
import App from './App.tsx'

// Use locally bundled Monaco instead of loading from CDN (jsDelivr).
// This is required for air-gapped / offline environments.
loader.config({ monaco })

// Configure Monaco web worker (required for Vite bundling).
// The ?worker import uses Vite's built-in worker bundling.
self.MonacoEnvironment = {
  getWorker() {
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' },
    )
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
