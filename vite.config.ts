import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Import the CSS injected by JS plugin to ensure Tailwind styles are bundled
// into the JavaScript output. Without this plugin Vite extracts CSS into a
// separate file which wasn't being served correctly on Vercel, resulting in
// missing styles on the deployed site. The plugin injects the compiled CSS
// into the JavaScript bundle so styles are always applied.
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Inject compiled CSS into the JS bundle so that it is always loaded in
    // environments where static CSS assets may not be served correctly (e.g.
    // Vercel).  This eliminates the separate CSS file and resolves missing
    // styles on deployment.
    cssInjectedByJs(),
  ],
})
