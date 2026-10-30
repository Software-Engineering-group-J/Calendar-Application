import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Windows-side edits under /mnt/c may not send filesystem events to WSL.
      usePolling: Boolean(process.env.WSL_DISTRO_NAME),
      interval: 300,
    },
  },
})
