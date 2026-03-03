import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                editor: 'editor.html',
            }
        }
    },
    server: {
        port: 5173,
        open: true,
    },
});
