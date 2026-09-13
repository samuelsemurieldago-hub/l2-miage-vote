import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

// Checked here, before ./App (and therefore ./lib/supabase) is ever
// imported: the Supabase client throws synchronously on creation when the
// URL/key are missing, which would otherwise crash the whole app to a
// blank screen before React gets a chance to render anything — including
// the public student-facing pages that don't even need Auth.
const isConfigured = REQUIRED_ENV_VARS.every((key) => Boolean(import.meta.env[key]));

const root = createRoot(document.getElementById('root')!);

if (!isConfigured) {
  const { SupabaseSetupNotice } = await import('./components/SupabaseSetupNotice.tsx');
  root.render(
    <StrictMode>
      <SupabaseSetupNotice />
    </StrictMode>,
  );
} else {
  const { default: App } = await import('./App.tsx');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
