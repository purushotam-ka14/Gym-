
import "dotenv/config";

import express, {
  NextFunction,
  Request,
  Response,
} from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import {
  apiRateLimit,
  cleanupRateLimitBuckets,
  corsMiddleware,
  helmetMiddleware,
  securityHeaders,
} from "./security";

import { MembershipPlan } from "./models/MembershipPlan";
import { User } from "./models/User";
import { Attendance } from "./models/Attendance";
import { FollowUp } from "./models/FollowUp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLANS = [
  {
    name: "1 month",
    duration: "1 month",
    price: 999,
    label: "FLEXIBLE",
    description:
      "Short-term gym membership with access to attendance and QR check-in.",
    featured: false,
  },
  {
    name: "6 months",
    duration: "6 months",
    price: 4999,
    label: "CONSISTENT",
    description:
      "Mid-term membership for a steady training routine and attendance streak.",
    featured: true,
  },
  {
    name: "1 year",
    duration: "1 year",
    price: 7999,
    label: "COMMITTED",
    description:
      "Annual gym membership with a full year of training and member support.",
    featured: false,
  },
];

/* ============================================================
   MEMBER REWARDS / STREAK POINTS
   ============================================================ */

const MemberRewardsSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastCheckInDate: {
      type: Date,
      default: null,
    },

    lastRepairDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const MemberRewards =
  mongoose.models.MemberRewards ||
  mongoose.model(
    "MemberRewards",
    MemberRewardsSchema,
  );

/* ============================================================
   MANUAL MEMBERSHIP PAYMENTS / EXTENSIONS
   ============================================================ */

const MembershipPaymentSchema =
  new mongoose.Schema(
    {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MembershipPlan",
      },

      planName: {
        type: String,
        required: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      paymentMethod: {
        type: String,
        enum: [
          "cash",
          "upi",
          "card",
          "bank_transfer",
          "other",
        ],
        default: "cash",
      },

      paidAt: {
        type: Date,
        default: Date.now,
      },

      membershipStartDate: {
        type: Date,
        required: true,
      },

      membershipEndDate: {
        type: Date,
        required: true,
      },

      note: {
        type: String,
        default: "",
      },

      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: true,
    },
  );

const MembershipPayment =
  mongoose.models.MembershipPayment ||
  mongoose.model(
    "MembershipPayment",
    MembershipPaymentSchema,
  );

/* ============================================================
   PHONE HELPERS

   Phone number is required.

   OTP HAS BEEN COMPLETELY REMOVED.
   ============================================================ */

function normalizeIndianPhone(
  phone: unknown,
) {
  const raw = String(phone || "").trim();

  if (
    !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(
      raw,
    )
  ) {
    return null;
  }

  const digits = raw.replace(
    /[\s-]/g,
    "",
  );

  if (
    /^\+91[6-9]\d{9}$/.test(
      digits,
    )
  ) {
    return digits;
  }

  if (
    /^[6-9]\d{9}$/.test(
      digits,
    )
  ) {
    return `+91${digits}`;
  }

  return null;
}

/* ============================================================
   MEMBERSHIP HELPERS
   ============================================================ */

function addMembershipDuration(
  startDate: Date,
  duration: string,
) {
  const result = new Date(startDate);

  const text = String(
    duration || "",
  ).toLowerCase();

  const matches = [
    ...text.matchAll(
      /(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)/g,
    ),
  ];

  if (!matches.length) {
    throw new Error(
      `Unsupported membership duration: ${duration}`,
    );
  }

  for (const match of matches) {
    const value = Number(match[1]);
    const unit = match[2];

    if (unit.startsWith("year")) {
      result.setFullYear(
        result.getFullYear() + value,
      );
    } else if (
      unit.startsWith("month")
    ) {
      result.setMonth(
        result.getMonth() + value,
      );
    } else if (
      unit.startsWith("week")
    ) {
      result.setDate(
        result.getDate() + value * 7,
      );
    } else {
      result.setDate(
        result.getDate() + value,
      );
    }
  }

  return result;
}

function parseDateInput(
  value: unknown,
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    String(value),
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

/* ============================================================
   MANUAL WHATSAPP WELCOME MESSAGE
   ============================================================ */

/*
  IMPORTANT:

  This does NOT send WhatsApp automatically.

  It creates a normal WhatsApp link:

  https://wa.me/91XXXXXXXXXX?text=...

  When Admin creates a member:

  1. Member is saved in MongoDB.
  2. A WhatsApp URL is generated.
  3. Admin.tsx opens WhatsApp.
  4. The welcome message is already typed.
  5. ADMIN MANUALLY PRESSES SEND.

  No Meta Cloud API.
  No Twilio.
  No MSG91.
  No OTP.
*/

function createWhatsAppWelcomeUrl({
  phone,
  name,
  membershipPlan,
  email,
}: {
  phone: string;
  name: string;
  membershipPlan?: string;
  email: string;
}) {
  /*
    WhatsApp wa.me requires the phone number
    without +, spaces or hyphens.

    Example:
    +919876543210
    becomes:
    919876543210
  */

  const whatsappPhone =
    phone.replace(/\D/g, "");

  const message = [
    "💪🔥 WELCOME TO PULSEFORGE GYM! 🔥💪",
    "",
    `Hello ${name}! 👋😊`,
    "",
    "🎉 Congratulations! Your membership is officially active!",
    "",
    `🏋️ Membership: ${membershipPlan || "Active"}`,
    `📧 Email: ${email}`,
    "",
    "🚀 Your journey towards a stronger, healthier & better YOU starts today!",
    "",
    "🔥 Train Hard",
    "💪 Stay Consistent",
    "🏆 Break Your Limits",
    "⚡ Become Unstoppable",
    "",
    "❤️ We're excited to have you as a part of the PulseForge Family!",
    "",
    "Get ready to sweat, grow and achieve your goals. 🏋️🔥",
    "",
    "See you at the gym! 💪😎",
    "",
    "— Team PulseForge Gym ❤️",
  ].join("\n");

  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    message,
  )}`;
}

/* ============================================================
   MONGODB
   ============================================================ */

let mongoConnected = false;

async function connectMongoDB() {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "MONGODB_URI is not set in .env",
    );

    return false;
  }

  try {
    await mongoose.connect(uri);

    mongoConnected = true;

    console.log(
      "MongoDB connected",
    );

    if (
      (await MembershipPlan.countDocuments()) ===
      0
    ) {
      await MembershipPlan.insertMany(
        DEFAULT_PLANS,
      );

      console.log(
        "Default membership plans created",
      );
    }

    return true;
  } catch (error) {
    mongoConnected = false;

    console.error(
      "MongoDB connection failed:",
      error,
    );

    return false;
  }
}

function requireMongo(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (
    !mongoConnected ||
    mongoose.connection.readyState !== 1
  ) {
    return res.status(503).json({
      message:
        "MongoDB is not connected.",
    });
  }

  next();
}

/* ============================================================
   AUTH TOKEN
   ============================================================ */

function createToken(
  userId: string,
  role: "member" | "owner",
) {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured in .env",
    );
  }

  const payload = Buffer.from(
    JSON.stringify({
      id: userId,
      role,

      exp:
        Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000,
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function readToken(
  req: Request,
) {
  const header =
    req.headers.authorization ||
    "";

  if (
    !header.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    header.slice(7);

  const [
    payload,
    signature,
  ] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  const expected = crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(payload)
    .digest("base64url");

  if (
    signature.length !==
      expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    )
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(
        payload,
        "base64url",
      ).toString("utf8"),
    );

    if (
      !data.id ||
      !data.role ||
      data.exp < Date.now()
    ) {
      return null;
    }

    return data as {
      id: string;
      role: "member" | "owner";
    };
  } catch {
    return null;
  }
}

/* ============================================================
   OWNER AUTHORIZATION
   ============================================================ */

async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token =
    readToken(req);

  if (
    !token ||
    token.role !== "owner" ||
    !mongoose.isValidObjectId(
      token.id,
    )
  ) {
    return res.status(401).json({
      message:
        "Owner authentication required.",
    });
  }

  try {
    const owner =
      await User.findOne({
        _id: token.id,
        role: "owner",
      })
        .select("_id")
        .lean();

    if (!owner) {
      return res.status(401).json({
        message:
          "Owner authentication required.",
      });
    }

    (
      req as Request & {
        auth?: typeof token;
      }
    ).auth = token;

    next();
  } catch (error) {
    console.error(
      "Owner authorization error:",
      error,
    );

    return res.status(401).json({
      message:
        "Owner authentication required.",
    });
  }
}

/* ============================================================
   USER HELPERS
   ============================================================ */

function publicUser(user: any) {
  return {
    id: user._id.toString(),

    name: user.name,

    email: user.email,

    phone:
      user.phone || "",

    role: user.role,

    membershipPlan:
      user.membershipPlan || "",

    membershipStartDate:
      user.membershipStartDate ||
      null,

    membershipEndDate:
      user.membershipEndDate ||
      null,
  };
}

function normalizeEmail(
  email: unknown,
) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function todayStart() {
  const d = new Date();

  d.setHours(
    0,
    0,
    0,
    0,
  );

  return d;
}

function addDays(
  date: Date,
  days: number,
) {
  const d = new Date(date);

  d.setDate(
    d.getDate() + days,
  );

  return d;
}

function initials(
  name: string,
) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) =>
        x[0]?.toUpperCase(),
      )
      .join("") || "U"
  );
}

/* ============================================================
   SERVER
   ============================================================ */

async function startServer() {
  const app = express();

  const server =
    createServer(app);

  await connectMongoDB();

  /* ============================================================
     SECURITY
     ============================================================ */

  app.set(
    "trust proxy",
    1,
  );

  app.disable(
    "x-powered-by",
  );

  app.use(
    helmetMiddleware,
  );

  app.use(
    securityHeaders,
  );

  app.use(
    corsMiddleware,
  );

  app.use(
    express.json({
      limit: "1mb",
      strict: true,
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "100kb",
    }),
  );

  mongoose.set(
    "sanitizeFilter",
    true,
  );

  /* ============================================================
     RATE LIMITERS
     ============================================================ */

  const loginLimiter =
    apiRateLimit({
      windowMs:
        15 * 60 * 1000,

      max: 15,

      name: "login",
    });

  const registerLimiter =
    apiRateLimit({
      windowMs:
        60 * 60 * 1000,

      max: 10,

      name: "register",
    });

  const limiterCleanup =
    setInterval(
      cleanupRateLimitBuckets,
      10 * 60 * 1000,
    );

  limiterCleanup.unref?.();

  /* ============================================================
     HEALTH
     ============================================================ */

  app.get(
    "/api/health",
    (_req, res) =>
      res.json({
        ok: true,

        mongodb:
          mongoConnected &&
          mongoose.connection
            .readyState === 1,
      }),
  );

  /* ============================================================
     MEMBER SELF-REGISTRATION DISABLED
     ============================================================ */

  app.post(
    "/api/auth/register",
    registerLimiter,
    requireMongo,
    async (_req, res) => {
      return res.status(403).json({
        message:
          "Member self-registration is disabled. Please contact the gym owner/admin to create your account.",
      });
    },
  );

  /* ============================================================
     OWNER REGISTRATION
     ============================================================ */

  app.post(
    "/api/auth/register-owner",
    registerLimiter,
    requireMongo,
    async (req, res) => {
      try {
        const {
          name,
          email,
          phone,
          password,
          confirmPassword,
          ownerKey,
        } = req.body;

        const configuredKey =
          process.env
            .OWNER_REGISTRATION_KEY;

        if (!configuredKey) {
          return res.status(500).json({
            message:
              "OWNER_REGISTRATION_KEY is not configured in .env.",
          });
        }

        if (
          !String(name || "").trim()
        ) {
          return res.status(400).json({
            message:
              "Name is required.",
          });
        }

        if (
          !normalizeEmail(email)
        ) {
          return res.status(400).json({
            message:
              "Email is required.",
          });
        }

        if (
          String(password || "")
            .length < 6
        ) {
          return res.status(400).json({
            message:
              "Password must be at least 6 characters.",
          });
        }

        if (
          String(password) !==
          String(
            confirmPassword || "",
          )
        ) {
          return res.status(400).json({
            message:
              "Passwords do not match.",
          });
        }

        if (
          String(ownerKey || "") !==
          configuredKey
        ) {
          return res.status(403).json({
            message:
              "Invalid owner registration key.",
          });
        }

        const normalizedEmail =
          normalizeEmail(email);

        if (
          await User.findOne({
            email:
              normalizedEmail,
          })
        ) {
          return res.status(409).json({
            message:
              "An account with this email already exists.",
          });
        }

        const user =
          await User.create({
            name: String(
              name,
            ).trim(),

            email:
              normalizedEmail,

            password:
              await bcrypt.hash(
                String(password),
                12,
              ),

            phone:
              String(
                phone || "",
              ).trim() ||
              undefined,

            role: "owner",
          });

        return res.status(201).json({
          message:
            "Owner registration successful.",

          token: createToken(
            user._id.toString(),
            "owner",
          ),

          user:
            publicUser(user),
        });
      } catch (error) {
        console.error(
          "Owner registration error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to register owner. Please try again.",
        });
      }
    },
  );

  /* ============================================================
     LOGIN
     ============================================================ */

  app.post(
    "/api/auth/login",
    loginLimiter,
    requireMongo,
    async (req, res) => {
      try {
        const {
          email,
          password,
          role,
        } = req.body;

        const user =
          await User.findOne({
            email:
              normalizeEmail(email),
          });

        if (!user) {
          return res.status(401).json({
            message:
              "Invalid email or password.",
          });
        }

        if (
          !(await bcrypt.compare(
            String(password || ""),
            user.password,
          ))
        ) {
          return res.status(401).json({
            message:
              "Invalid email or password.",
          });
        }

        if (
          (role === "owner" ||
            role === "member") &&
          user.role !== role
        ) {
          return res.status(403).json({
            message:
              role === "owner"
                ? "This account is not an owner account."
                : "This account is not a member account.",
          });
        }

        return res.json({
          message:
            "Login successful.",

          token: createToken(
            user._id.toString(),
            user.role,
          ),

          user:
            publicUser(user),
        });
      } catch (error) {
        console.error(
          "Login error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to login. Please try again.",
        });
      }
    },
  );

  /* ============================================================
     MEMBERSHIP PLANS
     ============================================================ */

  app.get(
    "/api/membership-plans",
    async (_req, res) => {
      try {
        if (!mongoConnected) {
          return res.json(
            DEFAULT_PLANS.map(
              (p, i) => ({
                ...p,
                _id: `default-${i}`,
              }),
            ),
          );
        }

        return res.json(
          await MembershipPlan.find()
            .sort({
              createdAt: 1,
            })
            .lean(),
        );
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to load membership plans.",
        });
      }
    },
  );

  app.post(
    "/api/membership-plans",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        const {
          name,
          duration,
          price,
          label,
          description,
          featured,
        } = req.body;

        if (
          !String(name || "").trim() ||
          !String(
            duration || "",
          ).trim() ||
          !String(
            description || "",
          ).trim()
        ) {
          return res.status(400).json({
            message:
              "Name, duration and description are required.",
          });
        }

        if (
          !Number.isFinite(
            Number(price),
          ) ||
          Number(price) < 0
        ) {
          return res.status(400).json({
            message:
              "Price must be a valid non-negative number.",
          });
        }

        const plan =
          await MembershipPlan.create(
            {
              name: String(
                name,
              ).trim(),

              duration:
                String(
                  duration,
                ).trim(),

              price: Number(
                price,
              ),

              label: String(
                label ||
                  "NEW PLAN",
              ).trim(),

              description:
                String(
                  description,
                ).trim(),

              featured:
                Boolean(
                  featured,
                ),
            },
          );

        return res
          .status(201)
          .json(plan);
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to create membership plan.",
        });
      }
    },
  );

  app.put(
    "/api/membership-plans/:id",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid membership plan id.",
          });
        }

        const {
          name,
          duration,
          price,
          label,
          description,
          featured,
        } = req.body;

        if (
          !String(name || "").trim() ||
          !String(
            duration || "",
          ).trim() ||
          !String(
            description || "",
          ).trim()
        ) {
          return res.status(400).json({
            message:
              "Name, duration and description are required.",
          });
        }

        if (
          !Number.isFinite(
            Number(price),
          ) ||
          Number(price) < 0
        ) {
          return res.status(400).json({
            message:
              "Price must be a valid non-negative number.",
          });
        }

        const plan =
          await MembershipPlan.findByIdAndUpdate(
            req.params.id,
            {
              name: String(
                name,
              ).trim(),

              duration:
                String(
                  duration,
                ).trim(),

              price: Number(
                price,
              ),

              label: String(
                label ||
                  "NEW PLAN",
              ).trim(),

              description:
                String(
                  description,
                ).trim(),

              featured:
                Boolean(
                  featured,
                ),
            },
            {
              new: true,
              runValidators: true,
            },
          );

        if (!plan) {
          return res.status(404).json({
            message:
              "Membership plan not found.",
          });
        }

        return res.json(plan);
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to update membership plan.",
        });
      }
    },
  );

  app.delete(
    "/api/membership-plans/:id",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid membership plan id.",
          });
        }

        const deleted =
          await MembershipPlan.findByIdAndDelete(
            req.params.id,
          );

        if (!deleted) {
          return res.status(404).json({
            message:
              "Membership plan not found.",
          });
        }

        return res.json({
          message:
            "Membership plan deleted.",
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to delete membership plan.",
        });
      }
    },
  );

  /* ============================================================
     ADMIN DASHBOARD
     ============================================================ */

  app.get(
    "/api/admin/dashboard",
    requireMongo,
    requireOwner,
    async (_req, res) => {
      try {
        const start =
          todayStart();

        const end7 =
          addDays(
            start,
            7,
          );

        const members =
          await User.find({
            role: "member",
          })
            .select(
              "name email phone membershipPlan membershipStartDate membershipEndDate createdAt",
            )
            .lean();

        const totalMembers =
          members.length;

        const activeMembers =
          members.filter(
            (m: any) =>
              !m.membershipEndDate ||
              new Date(
                m.membershipEndDate,
              ) >= start,
          ).length;

        const expiringMembers =
          members.filter(
            (m: any) =>
              m.membershipEndDate &&
              new Date(
                m.membershipEndDate,
              ) >= start &&
              new Date(
                m.membershipEndDate,
              ) <= end7,
          ).length;

        const expiredMembers =
          members.filter(
            (m: any) =>
              m.membershipEndDate &&
              new Date(
                m.membershipEndDate,
              ) < start,
          ).length;

        const checkinsToday =
          await Attendance.countDocuments(
            {
              checkedInAt:
                mongoose.trusted({
                  $gte: start,
                  $lt: addDays(
                    start,
                    1,
                  ),
                }),
            },
          );

        const previousStart =
          addDays(
            start,
            -1,
          );

        const checkinsYesterday =
          await Attendance.countDocuments(
            {
              checkedInAt:
                mongoose.trusted({
                  $gte:
                    previousStart,
                  $lt: start,
                }),
            },
          );

        const allAttendance =
          await Attendance.find({
            checkedInAt:
              mongoose.trusted({
                $gte: addDays(
                  start,
                  -29,
                ),
                $lt: addDays(
                  start,
                  1,
                ),
              }),
          })
            .select(
              "checkedInAt memberId",
            )
            .lean();

        const daily =
          Array.from(
            {
              length: 30,
            },
            (_, i) => {
              const d =
                addDays(
                  start,
                  i - 29,
                );

              const next =
                addDays(
                  d,
                  1,
                );

              return {
                date: d
                  .toISOString()
                  .slice(0, 10),

                label:
                  d.toLocaleDateString(
                    "en-IN",
                    {
                      month:
                        "short",
                      day: "2-digit",
                    },
                  ),

                count:
                  allAttendance.filter(
                    (a: any) =>
                      new Date(
                        a.checkedInAt,
                      ) >= d &&
                      new Date(
                        a.checkedInAt,
                      ) < next,
                  ).length,
              };
            },
          );

        const lastRows =
          await Attendance.aggregate(
            [
              {
                $sort: {
                  checkedInAt: -1,
                },
              },
              {
                $group: {
                  _id: "$memberId",

                  lastCheckIn: {
                    $first:
                      "$checkedInAt",
                  },
                },
              },
            ],
          );

        const lastMap =
          new Map(
            lastRows.map(
              (x: any) => [
                String(x._id),
                new Date(
                  x.lastCheckIn,
                ),
              ],
            ),
          );

        const followUps =
          members
            .map(
              (m: any) => {
                const last =
                  lastMap.get(
                    String(
                      m._id,
                    ),
                  );

                const days =
                  last
                    ? Math.floor(
                        (start.getTime() -
                          new Date(
                            last,
                          ).getTime()) /
                          86400000,
                      )
                    : 999;

                const expiry =
                  m.membershipEndDate
                    ? Math.ceil(
                        (new Date(
                          m.membershipEndDate,
                        ).getTime() -
                          start.getTime()) /
                          86400000,
                      )
                    : null;

                let reason =
                  "Active";

                let status =
                  "Active";

                if (
                  expiry !== null &&
                  expiry < 0
                ) {
                  reason = `Expired ${Math.abs(
                    expiry,
                  )} day${
                    Math.abs(
                      expiry,
                    ) === 1
                      ? ""
                      : "s"
                  } ago`;

                  status =
                    "Expired";
                } else if (
                  expiry !== null &&
                  expiry <= 7
                ) {
                  reason = `Plan expires in ${expiry} day${
                    expiry === 1
                      ? ""
                      : "s"
                  }`;

                  status =
                    "Expiring";
                } else if (
                  days >= 7
                ) {
                  reason = `${days} days since last check-in`;

                  status =
                    "At risk";
                }

                return {
                  id: String(
                    m._id,
                  ),

                  name:
                    m.name,

                  phone:
                    m.phone ||
                    "",

                  plan:
                    m.membershipPlan ||
                    "No plan",

                  status,

                  detail:
                    reason,

                  lastCheckIn:
                    last || null,

                  tone:
                    status ===
                    "Expired"
                      ? "coral"
                      : status ===
                          "Expiring"
                        ? "amber"
                        : status ===
                            "At risk"
                          ? "violet"
                          : "lime",

                  initials:
                    initials(
                      m.name,
                    ),
                };
              },
            )
            .filter(
              (m: any) =>
                m.status !==
                "Active",
            )
            .sort(
              (
                a: any,
                b: any,
              ) =>
                String(
                  a.detail,
                ).localeCompare(
                  String(
                    b.detail,
                  ),
                ),
            );

        const activeHealth =
          totalMembers
            ? Math.round(
                (activeMembers /
                  totalMembers) *
                  100,
              )
            : 0;

        return res.json({
          totalMembers,

          checkinsToday,

          checkinsYesterday,

          expiringMembers,

          expiredMembers,

          activeMembers,

          activeHealth,

          daily,

          followUps:
            followUps.slice(
              0,
              12,
            ),
        });
      } catch (error) {
        console.error(
          "Dashboard error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load dashboard data.",
        });
      }
    },
  );

  /* ============================================================
     ADMIN MEMBERS
     ============================================================ */

  app.get(
    "/api/admin/members",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        const q =
          String(
            req.query.q || "",
          )
            .trim()
            .toLowerCase();

        const status =
          String(
            req.query.status ||
              "All members",
          );

        const start =
          todayStart();

        const members =
          await User.find({
            role: "member",
          })
            .sort({
              createdAt: -1,
            })
            .lean();

        const ids =
          members.map(
            (m: any) =>
              m._id,
          );

        const ats =
          await Attendance.aggregate(
            [
              {
                $match: {
                  memberId: {
                    $in: ids,
                  },
                },
              },

              {
                $sort: {
                  checkedInAt:
                    -1,
                },
              },

              {
                $group: {
                  _id: "$memberId",

                  lastCheckIn: {
                    $first:
                      "$checkedInAt",
                  },
                },
              },
            ],
          );

        const lastMap =
          new Map(
            ats.map(
              (x: any) => [
                String(x._id),
                x.lastCheckIn,
              ],
            ),
          );

        const result =
          members
            .map(
              (m: any) => {
                const last =
                  lastMap.get(
                    String(
                      m._id,
                    ),
                  );

                const days =
                  last
                    ? Math.floor(
                        (start.getTime() -
                          new Date(
                            last,
                          ).getTime()) /
                          86400000,
                      )
                    : 999;

                const expiry =
                  m.membershipEndDate
                    ? Math.ceil(
                        (new Date(
                          m.membershipEndDate,
                        ).getTime() -
                          start.getTime()) /
                          86400000,
                      )
                    : null;

                let s =
                  "Active";

                let detail =
                  last
                    ? `Checked in ${
                        days === 0
                          ? "today"
                          : days === 1
                            ? "yesterday"
                            : `${days} days ago`
                      }`
                    : "No check-in yet";

                if (
                  expiry !== null &&
                  expiry < 0
                ) {
                  s =
                    "Expired";

                  detail = `Expired ${Math.abs(
                    expiry,
                  )} days ago`;
                } else if (
                  expiry !== null &&
                  expiry <= 7
                ) {
                  s =
                    "Expiring";

                  detail = `${Math.max(
                    0,
                    expiry,
                  )} days left`;
                } else if (
                  days >= 7
                ) {
                  s =
                    "At risk";

                  detail = `${days} days since check-in`;
                }

                return {
                  id: String(
                    m._id,
                  ),

                  name:
                    m.name,

                  email:
                    m.email,

                  phone:
                    m.phone ||
                    "",

                  plan:
                    m.membershipPlan ||
                    "No plan",

                  status: s,

                  detail,

                  tone:
                    s ===
                    "Expired"
                      ? "coral"
                      : s ===
                          "Expiring"
                        ? "amber"
                        : s ===
                            "At risk"
                          ? "violet"
                          : "lime",

                  initials:
                    initials(
                      m.name,
                    ),

                  membershipStartDate:
                    m.membershipStartDate ||
                    null,

                  membershipEndDate:
                    m.membershipEndDate ||
                    null,

                  lastCheckIn:
                    last || null,
                };
              },
            )
            .filter(
              (m: any) => {
                const text =
                  `${m.name} ${m.email} ${m.phone} ${m.plan}`.toLowerCase();

                return (
                  (!q ||
                    text.includes(
                      q,
                    )) &&
                  (status ===
                    "All members" ||
                    m.status ===
                      status)
                );
              },
            );

        return res.json(
          result,
        );
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to load members.",
        });
      }
    },
  );

  /* ============================================================
     CREATE MEMBER

     ONLY OWNER CAN CREATE MEMBER.

     Phone is required.

     NO OTP.

     Member is saved first.

     Then a manual WhatsApp URL is generated.

     WhatsApp is NOT automatically sent.
     Admin manually presses Send.
     ============================================================ */

  app.post(
    "/api/admin/members",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        const {
          name,
          email,
          phone,
          password,
          membershipPlan,
          membershipStartDate,
          membershipEndDate,
        } = req.body;

        /* ======================================================
           VALIDATE BASIC MEMBER DETAILS
           ====================================================== */

        const normalizedPhone =
          normalizeIndianPhone(
            phone,
          );

        if (
          !String(name || "").trim() ||
          !normalizeEmail(email) ||
          String(password || "")
            .length < 6
        ) {
          return res.status(400).json({
            message:
              "Name, email and a permanent password of at least 6 characters are required.",
          });
        }

        if (!normalizedPhone) {
          return res.status(400).json({
            message:
              "A valid 10-digit Indian mobile number is required.",
          });
        }

        const normalized =
          normalizeEmail(email);

        /* ======================================================
           DUPLICATE EMAIL
           ====================================================== */

        if (
          await User.findOne({
            email:
              normalized,
          })
        ) {
          return res.status(409).json({
            message:
              "An account with this email already exists.",
          });
        }

        /* ======================================================
           DUPLICATE PHONE
           ====================================================== */

        if (
          await User.findOne({
            phone:
              normalizedPhone,

            role: "member",
          })
        ) {
          return res.status(409).json({
            message:
              "A member with this phone number already exists.",
          });
        }

        /* ======================================================
           MEMBERSHIP START DATE
           ====================================================== */

        let parsedStartDate =
          membershipStartDate
            ? new Date(
                membershipStartDate,
              )
            : new Date();

        if (
          Number.isNaN(
            parsedStartDate.getTime(),
          )
        ) {
          parsedStartDate =
            new Date();
        }

        /* ======================================================
           MEMBERSHIP END DATE
           ====================================================== */

        let parsedEndDate:
          | Date
          | undefined;

        if (
          membershipEndDate
        ) {
          const endDate =
            new Date(
              membershipEndDate,
            );

          if (
            Number.isNaN(
              endDate.getTime(),
            )
          ) {
            return res.status(400).json({
              message:
                "Invalid membership end date.",
            });
          }

          parsedEndDate =
            endDate;
        }

        /* ======================================================
           CREATE MEMBER
           ====================================================== */

        const user =
          await User.create({
            name: String(
              name,
            ).trim(),

            email:
              normalized,

            phone:
              normalizedPhone,

            password:
              await bcrypt.hash(
                String(password),
                12,
              ),

            role: "member",

            membershipPlan:
              String(
                membershipPlan ||
                  "",
              ).trim() ||
              undefined,

            membershipStartDate:
              parsedStartDate,

            membershipEndDate:
              parsedEndDate,
          });

        /* ======================================================
           MANUAL WHATSAPP URL

           IMPORTANT:

           This does NOT send anything automatically.

           It only creates the WhatsApp link.

           Admin.tsx will open the link and the Admin
           will manually press Send in WhatsApp.
           ====================================================== */

        const whatsappUrl =
          createWhatsAppWelcomeUrl({
            phone:
              normalizedPhone,

            name:
              user.name,

            membershipPlan:
              user.membershipPlan ||
              "Active",

            email:
              user.email,
          });

        console.log(
          "Manual WhatsApp URL created:",
          whatsappUrl,
        );

        /* ======================================================
           MEMBER CREATED SUCCESSFULLY
           ====================================================== */

        return res
          .status(201)
          .json({
            message:
              "Member created successfully. WhatsApp is ready for manual sending.",

            user:
              publicUser(
                user,
              ),

            whatsappUrl,
          });
      } catch (error) {
        console.error(
          "Create member error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to add member.",
        });
      }
    },
  );

  /* ============================================================
     CHANGE MEMBER PASSWORD
     ============================================================ */

  app.put(
    "/api/admin/members/:id/password",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid member id.",
          });
        }

        const password =
          String(
            req.body?.password ||
              "",
          );

        const confirmPassword =
          String(
            req.body
              ?.confirmPassword ||
              "",
          );

        if (
          password.length < 6
        ) {
          return res.status(400).json({
            message:
              "Password must be at least 6 characters.",
          });
        }

        if (
          password !==
          confirmPassword
        ) {
          return res.status(400).json({
            message:
              "Passwords do not match.",
          });
        }

        const member =
          await User.findOne({
            _id: req.params.id,

            role: "member",
          });

        if (!member) {
          return res.status(404).json({
            message:
              "Member not found.",
          });
        }

        member.password =
          await bcrypt.hash(
            password,
            12,
          );

        await member.save();

        return res.json({
          message:
            "Member password changed successfully.",
        });
      } catch (error) {
        console.error(
          "Change member password error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to change member password.",
        });
      }
    },
  );

  /* ============================================================
     FOLLOW UPS
     ============================================================ */

  app.post(
    "/api/admin/follow-ups",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        const {
          memberId,
          reason,
          note,
        } = req.body;

        if (
          !mongoose.isValidObjectId(
            memberId,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid member id.",
          });
        }

        const member =
          await User.findOne({
            _id: memberId,
            role: "member",
          });

        if (!member) {
          return res.status(404).json({
            message:
              "Member not found.",
          });
        }

        const follow =
          await FollowUp.create({
            memberId,

            reason: String(
              reason ||
                "Follow-up",
            ),

            note: String(
              note || "",
            ),
          });

        return res
          .status(201)
          .json(follow);
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message:
            "Unable to create follow-up.",
        });
      }
    },
  );

  /* ============================================================
     RECORD PAYMENT / UPDATE MEMBERSHIP
     ============================================================ */

  app.post(
    "/api/admin/members/:id/membership",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid member id.",
          });
        }

        const member =
          await User.findOne({
            _id: req.params.id,
            role: "member",
          });

        if (!member) {
          return res.status(404).json({
            message:
              "Member not found.",
          });
        }

        const {
          planId,
          startDate,
          paymentAmount,
          paymentMethod,
          note,
        } = req.body;

        if (
          !mongoose.isValidObjectId(
            planId,
          )
        ) {
          return res.status(400).json({
            message:
              "Please select a valid membership plan.",
          });
        }

        const plan =
          await MembershipPlan.findById(
            planId,
          ).lean();

        if (!plan) {
          return res.status(404).json({
            message:
              "Membership plan not found.",
          });
        }

        let membershipStart =
          parseDateInput(
            startDate,
          );

        if (!membershipStart) {
          const today =
            todayStart();

          const currentEnd =
            member.membershipEndDate
              ? new Date(
                  member.membershipEndDate,
                )
              : null;

          membershipStart =
            currentEnd &&
            currentEnd >= today
              ? addDays(
                  currentEnd,
                  1,
                )
              : new Date();
        }

        membershipStart.setHours(
          0,
          0,
          0,
          0,
        );

        const membershipEnd =
          addMembershipDuration(
            membershipStart,
            String(
              plan.duration,
            ),
          );

        const amount =
          paymentAmount ===
            undefined ||
          paymentAmount ===
            null ||
          paymentAmount ===
            ""
            ? Number(
                plan.price,
              )
            : Number(
                paymentAmount,
              );

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount < 0
        ) {
          return res.status(400).json({
            message:
              "Payment amount must be a valid non-negative number.",
          });
        }

        const allowedMethods =
          [
            "cash",
            "upi",
            "card",
            "bank_transfer",
            "other",
          ];

        const method =
          allowedMethods.includes(
            String(
              paymentMethod,
            ),
          )
            ? String(
                paymentMethod,
              )
            : "cash";

        member.membershipPlan =
          String(plan.name);

        member.membershipStartDate =
          membershipStart;

        member.membershipEndDate =
          membershipEnd;

        await member.save();

        const payment =
          await MembershipPayment.create(
            {
              memberId:
                member._id,

              planId:
                plan._id,

              planName:
                plan.name,

              amount,

              paymentMethod:
                method,

              membershipStartDate:
                membershipStart,

              membershipEndDate:
                membershipEnd,

              note: String(
                note || "",
              ).trim(),

              recordedBy: (
                req as Request & {
                  auth?: {
                    id: string;
                  };
                }
              ).auth?.id,
            },
          );

        return res.json({
          message: `Payment recorded and ${plan.name} membership updated.`,

          member:
            publicUser(
              member,
            ),

          payment,

          calculated: {
            startDate:
              membershipStart,

            endDate:
              membershipEnd,

            duration:
              plan.duration,

            amount,
          },
        });
      } catch (error) {
        console.error(
          "Membership payment/extension error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to update membership.",
        });
      }
    },
  );

  /* ============================================================
     DELETE MEMBER
     ============================================================ */

  app.delete(
    "/api/admin/members/:id",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid member id.",
          });
        }

        const member =
          await User.findOne({
            _id: req.params.id,
            role: "member",
          });

        if (!member) {
          return res.status(404).json({
            message:
              "Member not found.",
          });
        }

        await Promise.all([
          Attendance.deleteMany({
            memberId:
              member._id,
          }),

          FollowUp.deleteMany({
            memberId:
              member._id,
          }),

          MembershipPayment.deleteMany(
            {
              memberId:
                member._id,
            },
          ),

          MemberRewards.deleteMany({
            memberId:
              member._id,
          }),
        ]);

        await User.deleteOne({
          _id: member._id,
        });

        return res.json({
          message: `${member.name} was deleted successfully.`,
        });
      } catch (error) {
        console.error(
          "Delete member error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to delete member.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER MEMBERSHIP HISTORY
     ============================================================ */

  app.get(
    "/api/membership/history",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const member =
          await User.findOne({
            _id: token.id,
            role: "member",
          })
            .select(
              "name email phone membershipPlan membershipStartDate membershipEndDate",
            )
            .lean();

        if (!member) {
          return res.status(404).json({
            message:
              "Member account not found.",
          });
        }

        const history =
          await MembershipPayment.find(
            {
              memberId:
                token.id,
            },
          )
            .select(
              "planId planName amount paymentMethod paidAt membershipStartDate membershipEndDate note createdAt",
            )
            .sort({
              paidAt: -1,
              createdAt: -1,
            })
            .lean();

        return res.json({
          member,
          history,
        });
      } catch (error) {
        console.error(
          "Member membership history error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load membership history.",
        });
      }
    },
  );

  /* ============================================================
     OWNER MEMBERSHIP HISTORY
     ============================================================ */

  app.get(
    "/api/admin/members/:id/membership-history",
    requireMongo,
    requireOwner,
    async (req, res) => {
      try {
        if (
          !mongoose.isValidObjectId(
            req.params.id,
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid member id.",
          });
        }

        const member =
          await User.findOne({
            _id: req.params.id,
            role: "member",
          })
            .select(
              "name membershipPlan membershipStartDate membershipEndDate",
            )
            .lean();

        if (!member) {
          return res.status(404).json({
            message:
              "Member not found.",
          });
        }

        const history =
          await MembershipPayment.find(
            {
              memberId:
                req.params.id,
            },
          )
            .sort({
              paidAt: -1,
            })
            .lean();

        return res.json({
          member,
          history,
        });
      } catch (error) {
        console.error(
          "Membership history error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load membership history.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER ATTENDANCE - CHECK IN
     ============================================================ */

  app.post(
    "/api/attendance/checkin",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const memberId =
          token.id;

        const now =
          new Date();

        const start =
          todayStart();

        const end =
          addDays(
            start,
            1,
          );

        const existing =
          await Attendance.findOne(
            {
              memberId,

              checkedInAt:
                mongoose.trusted({
                  $gte: start,
                  $lt: end,
                }),
            },
          ).sort({
            checkedInAt: -1,
          });

        if (existing) {
          const rewards =
            await MemberRewards.findOne(
              {
                memberId,
              },
            ).lean();

          return res.json({
            message:
              "Already checked in today.",

            attendance:
              existing,

            rewards:
              rewards || {
                points: 0,
                currentStreak: 0,
                longestStreak: 0,
              },

            pointsAwarded:
              0,
          });
        }

        const previousAttendance =
          await Attendance.findOne({
            memberId,

            checkedInAt:
              mongoose.trusted({
                $lt: start,
              }),
          })
            .sort({
              checkedInAt:
                -1,
            })
            .lean();

        let rewards =
          await MemberRewards.findOne(
            {
              memberId,
            },
          );

        if (!rewards) {
          rewards =
            await MemberRewards.create(
              {
                memberId,
                points: 0,
                currentStreak: 0,
                longestStreak: 0,
              },
            );
        }

        let newStreak =
          1;

        if (
          previousAttendance?.checkedInAt
        ) {
          const previousDate =
            new Date(
              previousAttendance.checkedInAt,
            );

          const previousStart =
            new Date(
              previousDate,
            );

          previousStart.setHours(
            0,
            0,
            0,
            0,
          );

          const daysSinceLastCheckIn =
            Math.floor(
              (start.getTime() -
                previousStart.getTime()) /
                86400000,
            );

          if (
            daysSinceLastCheckIn ===
            1
          ) {
            newStreak =
              Math.max(
                1,
                rewards.currentStreak,
              ) + 1;
          } else if (
            daysSinceLastCheckIn >
              1 &&
            rewards.lastRepairDate &&
            new Date(
              rewards.lastRepairDate,
            ).getTime() >=
              previousStart.getTime()
          ) {
            newStreak =
              Math.max(
                1,
                rewards.currentStreak,
              ) + 1;
          }
        }

        const attendance =
          await Attendance.create({
            memberId,

            checkedInAt: now,

            checkInMethod:
              "qr",
          });

        rewards.points += 10;

        rewards.currentStreak =
          newStreak;

        rewards.longestStreak =
          Math.max(
            rewards.longestStreak,
            newStreak,
          );

        rewards.lastCheckInDate =
          now;

        await rewards.save();

        return res
          .status(201)
          .json({
            message:
              "Check-in confirmed.",

            attendance,

            streak:
              rewards.currentStreak,

            pointsAwarded:
              10,

            rewards: {
              points:
                rewards.points,

              currentStreak:
                rewards.currentStreak,

              longestStreak:
                rewards.longestStreak,
            },
          });
      } catch (error) {
        console.error(
          "Check-in error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to record check-in.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER ATTENDANCE - CHECK OUT
     ============================================================ */

  app.post(
    "/api/attendance/checkout",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const start =
          todayStart();

        const end =
          addDays(
            start,
            1,
          );

        const attendance =
          await Attendance.findOne(
            {
              memberId:
                token.id,

              checkedInAt:
                mongoose.trusted({
                  $gte: start,
                  $lt: end,
                }),
            },
          ).sort({
            checkedInAt: -1,
          });

        if (!attendance) {
          return res.status(400).json({
            message:
              "You must check in before checking out.",
          });
        }

        if (
          attendance.checkedOutAt
        ) {
          return res.status(400).json({
            message:
              "You have already checked out today.",

            attendance,
          });
        }

        attendance.checkedOutAt =
          new Date();

        attendance.checkOutMethod =
          "qr";

        await attendance.save();

        return res.json({
          message:
            "Check-out confirmed.",

          attendance,
        });
      } catch (error) {
        console.error(
          "Check-out error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to record check-out.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER ATTENDANCE - TODAY
     ============================================================ */

  app.get(
    "/api/attendance/today",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const start =
          todayStart();

        const end =
          addDays(
            start,
            1,
          );

        const attendance =
          await Attendance.findOne(
            {
              memberId:
                token.id,

              checkedInAt:
                mongoose.trusted({
                  $gte: start,
                  $lt: end,
                }),
            },
          ).sort({
            checkedInAt: -1,
          });

        const rewards =
          await MemberRewards.findOne(
            {
              memberId:
                token.id,
            },
          ).lean();

        return res.json({
          checkedIn:
            Boolean(
              attendance,
            ),

          checkedOut:
            Boolean(
              attendance?.checkedOutAt,
            ),

          attendance:
            attendance ||
            null,

          rewards:
            rewards || {
              points: 0,
              currentStreak: 0,
              longestStreak: 0,
            },
        });
      } catch (error) {
        console.error(
          "Today's attendance error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load today's attendance.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER REWARDS
     ============================================================ */

  app.get(
    "/api/rewards",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const rewards =
          await MemberRewards.findOne(
            {
              memberId:
                token.id,
            },
          ).lean();

        return res.json({
          points:
            rewards?.points ||
            0,

          currentStreak:
            rewards?.currentStreak ||
            0,

          longestStreak:
            rewards?.longestStreak ||
            0,

          repairCost:
            50,

          checkInPoints:
            10,
        });
      } catch (error) {
        console.error(
          "Rewards error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load rewards.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER REWARDS - REPAIR STREAK
     ============================================================ */

  app.post(
    "/api/rewards/repair-streak",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const memberId =
          token.id;

        const start =
          todayStart();

        const end =
          addDays(
            start,
            1,
          );

        const rewards =
          await MemberRewards.findOne(
            {
              memberId,
            },
          );

        if (!rewards) {
          return res.status(400).json({
            message:
              "You do not have a streak to repair yet.",
          });
        }

        if (
          rewards.points < 50
        ) {
          return res.status(400).json({
            message:
              "You need 50 points to repair your streak.",

            points:
              rewards.points,

            repairCost:
              50,
          });
        }

        const todayAttendance =
          await Attendance.findOne(
            {
              memberId,

              checkedInAt:
                mongoose.trusted({
                  $gte: start,
                  $lt: end,
                }),
            },
          );

        if (!todayAttendance) {
          return res.status(400).json({
            message:
              "Check in today before repairing your streak.",
          });
        }

        const previousAttendance =
          await Attendance.find(
            {
              memberId,

              checkedInAt:
                mongoose.trusted({
                  $lt: start,
                }),
            },
          )
            .sort({
              checkedInAt:
                -1,
            })
            .lean();

        if (
          previousAttendance.length ===
          0
        ) {
          return res.status(400).json({
            message:
              "There is no previous streak to repair.",
          });
        }

        const latestPreviousDate =
          new Date(
            previousAttendance[0]
              .checkedInAt,
          );

        const latestPreviousStart =
          new Date(
            latestPreviousDate,
          );

        latestPreviousStart.setHours(
          0,
          0,
          0,
          0,
        );

        const daysSincePrevious =
          Math.floor(
            (start.getTime() -
              latestPreviousStart.getTime()) /
              86400000,
          );

        if (
          daysSincePrevious <=
          1
        ) {
          return res.status(400).json({
            message:
              "Your streak is not broken, so no repair is needed.",
          });
        }

        let repairedBaseStreak =
          1;

        let previousDay =
          latestPreviousStart;

        for (
          let i = 1;
          i <
          previousAttendance.length;
          i++
        ) {
          const currentDate =
            new Date(
              previousAttendance[i]
                .checkedInAt,
            );

          currentDate.setHours(
            0,
            0,
            0,
            0,
          );

          const gap =
            Math.floor(
              (previousDay.getTime() -
                currentDate.getTime()) /
                86400000,
            );

          if (gap === 1) {
            repairedBaseStreak++;

            previousDay =
              currentDate;
          } else {
            break;
          }
        }

        rewards.points -=
          50;

        rewards.currentStreak =
          repairedBaseStreak +
          1;

        rewards.longestStreak =
          Math.max(
            rewards.longestStreak,
            rewards.currentStreak,
          );

        rewards.lastRepairDate =
          new Date();

        await rewards.save();

        return res.json({
          message:
            "Streak repaired successfully.",

          pointsUsed:
            50,

          rewards: {
            points:
              rewards.points,

            currentStreak:
              rewards.currentStreak,

            longestStreak:
              rewards.longestStreak,
          },
        });
      } catch (error) {
        console.error(
          "Streak repair error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to repair streak.",
        });
      }
    },
  );

  /* ============================================================
     MEMBER ATTENDANCE - HISTORY
     ============================================================ */

  app.get(
    "/api/attendance/history",
    requireMongo,
    async (req, res) => {
      try {
        const token =
          readToken(req);

        if (!token) {
          return res.status(401).json({
            message:
              "Login required.",
          });
        }

        if (
          token.role !==
          "member"
        ) {
          return res.status(403).json({
            message:
              "Member account required.",
          });
        }

        const history =
          await Attendance.find(
            {
              memberId:
                token.id,
            },
          )
            .sort({
              checkedInAt:
                -1,
            })
            .limit(100)
            .lean();

        return res.json(
          history,
        );
      } catch (error) {
        console.error(
          "Attendance history error:",
          error,
        );

        return res.status(500).json({
          message:
            "Unable to load attendance history.",
        });
      }
    },
  );

  /* ============================================================
     STATIC FRONTEND
     ============================================================ */

  const staticPath = path.resolve(
  __dirname,
  "../dist/public",
);

  app.use(
    express.static(
      staticPath,
    ),
  );

  app.get(
    "*",
    (_req, res) =>
      res.sendFile(
        path.join(
          staticPath,
          "index.html",
        ),
      ),
  );

  /* ============================================================
     START SERVER
     ============================================================ */

  const port =
    Number(
      process.env.PORT ||
        5000,
    );

  server.listen(
    port,
    () =>
      console.log(
        `Server running on http://localhost:${port}`,
      ),
  );
}

startServer().catch(
  (error) => {
    console.error(
      "Server startup failed:",
      error,
    );

    process.exit(1);
  },
);

