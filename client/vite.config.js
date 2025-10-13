import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",   
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "^/api": "http://localhost:5000",
      "^/bomhub": {
        target: "http://localhost:5000",
        ws: true
      }
    }
  }
});
