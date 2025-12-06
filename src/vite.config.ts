import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [dyadComponentTagger(), react()],
      // Removed the define block as environment variables are now accessed via import.meta.env
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Updated alias to point to src folder
        }
      }
    };
});