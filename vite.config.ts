import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type ApiHandler = (req: unknown, res: unknown) => Promise<void>;

function apiDevServer(): Plugin {
  const routes: Record<string, () => Promise<{ default: ApiHandler }>> = {
    "/api/generate-yard-preview": () =>
      import("./api/generate-yard-preview") as Promise<{ default: ApiHandler }>,
    "/api/studio-lead": () =>
      import("./api/studio-lead") as Promise<{ default: ApiHandler }>,
  };

  return {
    name: "api-dev-server",
    configureServer(server) {
      for (const [route, load] of Object.entries(routes)) {
        server.middlewares.use(route, async (req, res, next) => {
          if (req.method !== "POST") {
            next();
            return;
          }

          const { default: handler } = await load();
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
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.OPENAI_API_KEY ||= env.OPENAI_API_KEY;
  process.env.OPENAI_IMAGE_MODEL ||= env.OPENAI_IMAGE_MODEL;
  process.env.SUPABASE_URL ||= env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_KEY ||= env.SUPABASE_SERVICE_KEY;
  process.env.RESEND_API_KEY ||= env.RESEND_API_KEY;
  process.env.STUDIO_FROM_EMAIL ||= env.STUDIO_FROM_EMAIL;

  return {
    plugins: [react(), apiDevServer()],
  };
});
