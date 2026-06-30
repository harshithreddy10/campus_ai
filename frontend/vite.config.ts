import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/students": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/auth": "http://127.0.0.1:8000",
      "/materials": "http://127.0.0.1:8000",
      "/videos": "http://127.0.0.1:8000",
      "/syllabus": "http://127.0.0.1:8000",
      "/search": "http://127.0.0.1:8000",
      "/settings": "http://127.0.0.1:8000",
      "/status": "http://127.0.0.1:8000",
    },
  },
});
