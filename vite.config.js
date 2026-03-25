import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'xlsx-vendor',
              test: /node_modules[\\/]xlsx/,
            },
            {
              name: 'charts-vendor',
              test: /node_modules[\\/](recharts|chart\.js|react-chartjs-2)/,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase/,
            },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  }
})
