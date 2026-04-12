import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('microsoft-cognitiveservices-speech-sdk')) {
            return 'speech-sdk'
          }
          if (id.includes(`${path.sep}src${path.sep}app${path.sep}data${path.sep}verbData.ts`)) {
            return 'learning-data'
          }
          if (!id.includes('node_modules')) return
          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('cmdk') ||
            id.includes('embla-carousel-react') ||
            id.includes('react-day-picker') ||
            id.includes('react-resizable-panels') ||
            id.includes('vaul') ||
            id.includes('sonner')
          ) {
            return 'ui-vendor'
          }
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
