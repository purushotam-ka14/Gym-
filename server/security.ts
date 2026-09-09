import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

// helmet sets a broad set of well-known protective headers
// (X-Content-Type-Options, X-Frame-Options, X-DNS-Prefetch-Control,
// Cross-Origin-Opener-Policy, etc.).
//
// Content-Security-Policy is left off here because this app loads
// Google Fonts and, on some pages, a Google Maps script from an
// external URL.
//
// Add a tailored CSP later once every external resource this app
// loads is explicitly allow-listed.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,

  // HSTS is applied manually below only for HTTPS + production
  // requests, so it's disabled here to avoid helmet sending it
  // unconditionally (e.g. over local HTTP).
  hsts: false,
});

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // HSTS is sent only when the request is already HTTPS in production.
  // This avoids breaking local HTTP development.
  if (process.env.NODE_ENV === "production" && req.secure) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
}

// CORS: the frontend and API are served from the same Express
// app/origin in production.
//
// During local development, Vite runs the frontend on port 3000
// while the Express API runs on port 5000. Therefore localhost:3000
// and 127.0.0.1:3000 must be explicitly allowed.
//
// Other websites remain blocked.
//
// If you ever host the frontend on a different domain from the API,
// add that domain to ALLOWED_ORIGINS in .env as a comma-separated
// list, e.g.
// ALLOWED_ORIGINS=https://app.example.com,https://www.example.com

const allowedOrigins = [
  // Local development frontend
  "http://localhost:3000",
  "http://127.0.0.1:3000",

  // Express server serving the frontend locally
  "http://localhost:5000",
  "http://127.0.0.1:5000",

  // Render production site
  "https://gym-1-mjo6.onrender.com",

  // Additional production/configured origins
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header = same-origin request or a non-browser client;
    // allow it.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: false,
};

export const corsMiddleware = cors(corsOptions);

export function apiRateLimit(options: {
  windowMs: number;
  max: number;
  name: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.name}:${clientIp(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      return next();
    }

    existing.count += 1;

    if (existing.count > options.max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );

      res.setHeader("Retry-After", String(retryAfter));

      return res.status(429).json({
        message:
          "Too many requests. Please try again later.",
      });
    }

    next();
  };
}

export function cleanupRateLimitBuckets() {
  const now = Date.now();

  // Using Map.forEach() instead of for...of avoids the
  // TypeScript TS2802 error when downlevel iteration is disabled.
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
}