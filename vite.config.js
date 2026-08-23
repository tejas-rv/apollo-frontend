import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const backend = env.VITE_BACKEND_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
        "/swagger-ui": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
        "/v3": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
        "/actuator": {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});