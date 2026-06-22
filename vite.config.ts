import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function apiDevServer(): Plugin {
  return {
    name: "api-dev-server",
    configureServer(server) {
      server.middlewares.use("/api/generate-yard-preview", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const { default: handler } = await import("./api/generate-yard-preview");
        const apiResponse = res as ServerResponse & {
          status: (statusCode: number) => typeof apiResponse;
          json: (body: unknown) => void;
        };

        apiResponse.status = (statusCode: number) => {
          apiResponse.statusCode = statusCode;
          return apiResponse;
        };
        apiResponse.json = (body: unknown) => {
          if (!apiResponse.headersSent) {
            apiResponse.setHeader("Content-Type", "application/json");
          }
          apiResponse.end(JSON.stringify(body));
        };

        await handler(req as IncomingMessage & { body?: unknown }, apiResponse);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.OPENAI_API_KEY ||= env.OPENAI_API_KEY;
  process.env.OPENAI_IMAGE_MODEL ||= env.OPENAI_IMAGE_MODEL;

  return {
    plugins: [react(), apiDevServer()],
  };
});
