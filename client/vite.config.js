import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: "/",                 // viktiga absoluta paths
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        bomb: resolve(__dirname, "bomb.html"),
        admin: resolve(__dirname, "admin.html"),
        code: resolve(__dirname, "code.html"),
        activate: resolve(__dirname, "activate.html"),
        wire_red: resolve(__dirname, "wire-red.html"),
        wire_blue: resolve(__dirname, "wire-blue.html"),
        wire_green: resolve(__dirname, "wire-green.html"),
        wire_yellow: resolve(__dirname, "wire-yellow.html"),
        wire_white: resolve(__dirname, "wire-white.html"),
        wire_black: resolve(__dirname, "wire-black.html")        
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "^/api": "http://localhost:5000",
      "^/bomhub": { target: "http://localhost:5000", ws: true }
    }
  }
});
