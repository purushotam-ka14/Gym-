import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import {
  defineConfig,
  type Plugin,
  type ViteDevServer,
} from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Paths
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");

const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
const TRIM_TARGET_BYTES = Math.floor(
  MAX_LOG_SIZE_BYTES * 0.6,
);

// =============================================================================
// Types
// =============================================================================

type LogSource =
  | "browserConsole"
  | "networkRequests"
  | "sessionReplay";

// =============================================================================
// Manus Debug Collector - Helpers
// =============================================================================

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, {
      recursive: true,
    });
  }
}

function trimLogFile(
  logPath: string,
  maxSize: number,
) {
  try {
    if (!fs.existsSync(logPath)) {
      return;
    }

    if (fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs
      .readFileSync(logPath, "utf-8")
      .split("\n");

    const keptLines: string[] = [];
    let keptBytes = 0;

    for (
      let i = lines.length - 1;
      i >= 0;
      i--
    ) {
      const lineBytes = Buffer.byteLength(
        `${lines[i]}\n`,
        "utf-8",
      );

      if (
        keptBytes + lineBytes >
        TRIM_TARGET_BYTES
      ) {
        break;
      }

      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(
      logPath,
      keptLines.join("\n"),
      "utf-8",
    );
  } catch {
    // Ignore log trimming errors
  }
}

function writeToLogFile(
  source: LogSource,
  entries: unknown[],
) {
  if (entries.length === 0) {
    return;
  }

  ensureLogDir();

  const logPath = path.join(
    LOG_DIR,
    `${source}.log`,
  );

  const lines = entries.map((entry) => {
    const timestamp =
      new Date().toISOString();

    return `[${timestamp}] ${JSON.stringify(entry)}`;
  });

  fs.appendFileSync(
    logPath,
    `${lines.join("\n")}\n`,
    "utf-8",
  );

  trimLogFile(
    logPath,
    MAX_LOG_SIZE_BYTES,
  );
}

// =============================================================================
// Manus Debug Collector Plugin
// =============================================================================

function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (
        process.env.NODE_ENV ===
        "production"
      ) {
        return html;
      }

      return {
        html,

        tags: [
          {
            tag: "script",

            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },

            injectTo: "head",
          },
        ],
      };
    },

    configureServer(
      server: ViteDevServer,
    ) {
      server.middlewares.use(
        "/__manus__/logs",
        (req, res, next) => {
          if (req.method !== "POST") {
            return next();
          }

          const handlePayload = (
            payload: any,
          ) => {
            if (
              payload.consoleLogs?.length >
              0
            ) {
              writeToLogFile(
                "browserConsole",
                payload.consoleLogs,
              );
            }

            if (
              payload.networkRequests
                ?.length > 0
            ) {
              writeToLogFile(
                "networkRequests",
                payload.networkRequests,
              );
            }

            if (
              payload.sessionEvents
                ?.length > 0
            ) {
              writeToLogFile(
                "sessionReplay",
                payload.sessionEvents,
              );
            }

            res.writeHead(200, {
              "Content-Type":
                "application/json",
            });

            res.end(
              JSON.stringify({
                success: true,
              }),
            );
          };

          const reqBody = (
            req as {
              body?: unknown;
            }
          ).body;

          if (
            reqBody &&
            typeof reqBody === "object"
          ) {
            try {
              handlePayload(reqBody);
            } catch (error) {
              res.writeHead(400, {
                "Content-Type":
                  "application/json",
              });

              res.end(
                JSON.stringify({
                  success: false,
                  error: String(error),
                }),
              );
            }

            return;
          }

          let body = "";

          req.on(
            "data",
            (chunk) => {
              body += chunk.toString();
            },
          );

          req.on("end", () => {
            try {
              const payload =
                JSON.parse(body);

              handlePayload(payload);
            } catch (error) {
              res.writeHead(400, {
                "Content-Type":
                  "application/json",
              });

              res.end(
                JSON.stringify({
                  success: false,
                  error: String(error),
                }),
              );
            }
          });
        },
      );
    },
  };
}

// =============================================================================
// Manus Storage Proxy Plugin
// =============================================================================

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",

    configureServer(
      server: ViteDevServer,
    ) {
      server.middlewares.use(
        "/manus-storage",
        async (req, res) => {
          const key = req.url?.replace(
            /^\//,
            "",
          );

          if (!key) {
            res.writeHead(400, {
              "Content-Type":
                "text/plain",
            });

            res.end(
              "Missing storage key",
            );

            return;
          }

          const forgeBaseUrl = (
            process.env
              .BUILT_IN_FORGE_API_URL ||
            ""
          ).replace(
            /\/+$/,
            "",
          );

          const forgeKey =
            process.env
              .BUILT_IN_FORGE_API_KEY;

          if (
            !forgeBaseUrl ||
            !forgeKey
          ) {
            res.writeHead(500, {
              "Content-Type":
                "text/plain",
            });

            res.end(
              "Storage proxy not configured",
            );

            return;
          }

          try {
            const forgeUrl = new URL(
              "v1/storage/presign/get",
              `${forgeBaseUrl}/`,
            );

            forgeUrl.searchParams.set(
              "path",
              key,
            );

            const forgeResp =
              await fetch(
                forgeUrl,
                {
                  headers: {
                    Authorization:
                      `Bearer ${forgeKey}`,
                  },
                },
              );

            if (!forgeResp.ok) {
              res.writeHead(502, {
                "Content-Type":
                  "text/plain",
              });

              res.end(
                "Storage backend error",
              );

              return;
            }

            const { url } =
              (await forgeResp.json()) as {
                url: string;
              };

            if (!url) {
              res.writeHead(502, {
                "Content-Type":
                  "text/plain",
              });

              res.end(
                "Empty signed URL",
              );

              return;
            }

            res.writeHead(307, {
              Location: url,
              "Cache-Control":
                "no-store",
            });

            res.end();
          } catch {
            res.writeHead(502, {
              "Content-Type":
                "text/plain",
            });

            res.end(
              "Storage proxy error",
            );
          }
        },
      );
    },
  };
}

// =============================================================================
// Vite Plugins
// =============================================================================

const plugins = [
  react(),
  tailwindcss(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
];

// =============================================================================
// Vite Configuration
// =============================================================================

export default defineConfig({
  plugins,

  // ---------------------------------------------------------------------------
  // Path aliases
  // ---------------------------------------------------------------------------

  resolve: {
    alias: {
      "@": path.resolve(
        import.meta.dirname,
        "client",
        "src",
      ),

      "@shared": path.resolve(
        import.meta.dirname,
        "shared",
      ),

      "@assets": path.resolve(
        import.meta.dirname,
        "attached_assets",
      ),
    },
  },

  // ---------------------------------------------------------------------------
  // Environment variables
  // ---------------------------------------------------------------------------

  envDir: path.resolve(
    import.meta.dirname,
  ),

  // ---------------------------------------------------------------------------
  // Frontend root
  // ---------------------------------------------------------------------------

  root: path.resolve(
    import.meta.dirname,
    "client",
  ),

  // ---------------------------------------------------------------------------
  // Production build
  // ---------------------------------------------------------------------------

  build: {
    outDir: path.resolve(
      import.meta.dirname,
      "dist",
      "public",
    ),

    emptyOutDir: true,
  },

  // ---------------------------------------------------------------------------
  // Development server
  // ---------------------------------------------------------------------------

  server: {
    port: 3000,

    strictPort: false,

    host: true,

    // -------------------------------------------------------------------------
    // IMPORTANT:
    // Forward all /api requests from Vite (3000)
    // to Express backend (5000).
    // -------------------------------------------------------------------------

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },

    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],

    fs: {
      strict: true,

      deny: [
        "**/.*",
      ],
    },
  },
});