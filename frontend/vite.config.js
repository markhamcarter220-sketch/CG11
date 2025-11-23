import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'odds-verification.preview.emergentagent.com',
      '.preview.emergentagent.com',
      'localhost',
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
});
