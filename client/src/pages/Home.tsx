import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CircleCheck,
  Database,
  EyeOff,
  LockKeyhole,
  MapPin,
  Clock3,
  LogOut,
  MoreHorizontal,
  PhoneCall,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import jsQR from "jsqr";

type Member = {
  name: string;
  initials: string;
  plan: string;
  detail: string;
  color: string;
};

const members: Member[] = [
  {
    name: "Maya Chen",
    initials: "MC",
    plan: "Strength / annual",
    detail: "Last check-in · 9 days ago",
    color: "lime",
  },
  {
    name: "Arjun Rao",
    initials: "AR",
    plan: "Unlimited / monthly",
    detail: "Last check-in · 12 days ago",
    color: "violet",
  },
  {
    name: "Noah Williams",
    initials: "NW",
    plan: "Performance / 90 days",
    detail: "Expires in 6 days",
    color: "coral",
  },
];

function Logo() {
  return (
    <a className="brand" href="#top">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>

      <span>
        pulse<span className="brand-accent">forge</span>
      </span>
    </a>
  );
}

function GymScene() {
  return (
    <div
      className="gym-scene"
      aria-label="3D gym floor with equipment and gym information"
    >
      <div className="gym-ceiling-light light-left" />
      <div className="gym-ceiling-light light-right" />

      <div className="gym-floor-grid" />

      <div className="gym-back-wall">
        <span>
          KEEP
          <br />
          <b>GOING</b>
        </span>
      </div>

      <div className="gym-rack rack-left" />
      <div className="gym-rack rack-right" />
      <div className="gym-rack-top" />

      <div className="gym-barbell">
        <i className="plate plate-one" />
        <i className="plate plate-two" />
        <b />
        <i className="plate plate-two" />
        <i className="plate plate-one" />
      </div>

      <div className="gym-bench">
        <i />
        <b />
      </div>

      <div className="gym-treadmill">
        <div className="treadmill-screen">
          <Activity size={13} />
          <span>+18.4%</span>
        </div>

        <div className="treadmill-handle" />

        <div className="treadmill-belt">
          <i />
        </div>
      </div>

      <div className="gym-signal signal-checkin">
        <QrCode size={13} />
        <span>
          check-in
          <br />
          <b>08:42</b>
        </span>
      </div>

      <div className="gym-signal signal-streak">
        <Sparkles size={13} />
        <span>
          streak
          <br />
          <b>14 days</b>
        </span>
      </div>

      <div className="gym-signal signal-alert">
        <BellRing size={13} />
        <span>
          expiry
          <br />
          <b>6 days</b>
        </span>
      </div>

      <div className="gym-scene-caption">
        <span className="live-dot" />
        gym floor · live
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="member-row">
      <div className={`avatar avatar-${member.color}`}>
        {member.initials}
      </div>

      <div className="member-meta">
        <b>{member.name}</b>
        <span>{member.plan}</span>
      </div>

      <div className="member-detail">
        <span className="risk-dot risk-critical" />
        {member.detail}
      </div>

      <button
        className="row-action"
        onClick={() =>
          toast.success(
            `Follow-up task created for ${member.name}.`,
          )
        }
      >
        <PhoneCall size={14} />
        follow up
      </button>

      <button
        className="row-menu"
        aria-label={`More actions for ${member.name}`}
        onClick={() =>
          toast.info(`${member.name}'s member record.`)
        }
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

function BookingSection() {
  const [mode, setMode] = useState<"classes" | "trainers">(
    "classes",
  );

  const [selected, setSelected] =
    useState("Strength Circuit");

  const [date, setDate] = useState("2025-06-08");

  const options =
    mode === "classes"
      ? [
          "Strength Circuit",
          "HIIT & Conditioning",
          "Mobility Flow",
        ]
      : ["Jessica Lee", "Arjun Mehta", "Sofia Patel"];

  const book = (event: React.FormEvent) => {
    event.preventDefault();

    const formatted = new Date(
      `${date}T12:00:00`,
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    toast.success(
      `${mode === "classes" ? "Class" : "Trainer session"} requested`,
      {
        description: `${selected} · ${formatted}. The gym will confirm availability.`,
      },
    );
  };

  return (
    <section
      id="booking"
      className="booking-section booking-layout-section"
      style={{ background: "transparent" }}
    >
      <img
        className="section-background-image"
        src="/booking-bg.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <div className="booking-heading">
        <div>
          <p className="eyebrow">member booking</p>

          <h2>
            Book a class
            <br />
            <i>or trainer.</i>
          </h2>
        </div>

        <p>
          Choose a class or trainer and request a time directly
          from the gym.
        </p>
      </div>

      <form className="booking-card" onSubmit={book}>
        <div className="booking-tabs">
          <button
            type="button"
            className={mode === "classes" ? "active" : ""}
            onClick={() => {
              setMode("classes");
              setSelected("Strength Circuit");
            }}
          >
            <Activity size={15} />
            Classes
          </button>

          <button
            type="button"
            className={mode === "trainers" ? "active" : ""}
            onClick={() => {
              setMode("trainers");
              setSelected("Jessica Lee");
            }}
          >
            <UserRound size={15} />
            Trainers
          </button>
        </div>

        <div className="booking-fields">
          <label>
            <span>
              {mode === "classes"
                ? "Select a class"
                : "Select a trainer"}
            </span>

            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Preferred date</span>

            <div className="date-input">
              <CalendarDays size={15} />

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </label>

          <button className="booking-submit" type="submit">
            Request booking
            <ArrowUpRight size={15} />
          </button>
        </div>

        <p className="booking-note">
          <ShieldCheck size={13} />
          Booking requests are confirmed by gym staff.
        </p>
      </form>
    </section>
  );
}

function MemberPanel() {
  const [tab, setTab] = useState<"owner" | "member">("member");

  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [checkoutScanning, setCheckoutScanning] = useState(false);
  const [qrVerified, setQrVerified] = useState(false);
  const [qrError, setQrError] = useState("");
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrFrameRef = useRef<number | null>(null);

  // This is the only QR value accepted by the member check-in scanner.
  // Create the gym's check-in QR with exactly this text:
  // PULSEFORGE-GYM-CHECKIN

  const [loggedOut, setLoggedOut] = useState(false);

  const [points, setPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const [checkInPoints, setCheckInPoints] = useState(10);
  const [repairCost, setRepairCost] = useState(50);

  const [canRepairStreak, setCanRepairStreak] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const [memberName, setMemberName] = useState("Member");
  const [memberPlan, setMemberPlan] = useState("Membership plan");
  const [membershipEndDate, setMembershipEndDate] =
    useState<string | null>(null);

  const [attendanceHistory, setAttendanceHistory] = useState<
    Array<{
      checkedInAt: string;
      checkedOutAt?: string;
    }>
  >([]);

  const getToken = () => localStorage.getItem("pulseforge_token");

  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem("pulseforge_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const loadAttendanceData = async () => {
    const token = getToken();

    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const [todayResponse, rewardsResponse, historyResponse] =
        await Promise.all([
          fetch("/api/attendance/today", {
            headers,
          }),
          fetch("/api/rewards", {
            headers,
          }),
          fetch("/api/attendance/history", {
            headers,
          }),
        ]);

      if (todayResponse.ok) {
        const todayData = await todayResponse.json();

        setCheckedIn(Boolean(todayData.checkedIn));
        setCheckedOut(Boolean(todayData.checkedOut));

        if (todayData.rewards) {
          setPoints(Number(todayData.rewards.points || 0));
          setCurrentStreak(
            Number(todayData.rewards.currentStreak || 0),
          );
          setLongestStreak(
            Number(todayData.rewards.longestStreak || 0),
          );
        }
      }

      if (rewardsResponse.ok) {
        const rewardData = await rewardsResponse.json();

        setPoints(Number(rewardData.points || 0));
        setCurrentStreak(
          Number(rewardData.currentStreak || 0),
        );
        setLongestStreak(
          Number(rewardData.longestStreak || 0),
        );

        setCheckInPoints(
          Number(rewardData.checkInPoints || 10),
        );
        setRepairCost(
          Number(rewardData.repairCost || 50),
        );
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();

        if (Array.isArray(historyData)) {
          setAttendanceHistory(historyData);
        }
      }
    } catch (error) {
      console.error(
        "Unable to load member attendance data:",
        error,
      );
    }
  };

  useEffect(() => {
    const user = getStoredUser();

    if (user) {
      setMemberName(user.name || "Member");
      setMemberPlan(
        user.membershipPlan || "Membership plan",
      );
      setMembershipEndDate(
        user.membershipEndDate || null,
      );
    }

    if (getToken()) {
      loadAttendanceData();
    }
  }, []);

  useEffect(() => {
    /*
     * A streak can be repaired when:
     * - the member checked in today
     * - there is an older attendance record
     * - the previous attendance was not yesterday
     *
     * The backend performs the final validation.
     */
    if (!checkedIn || attendanceHistory.length < 2) {
      setCanRepairStreak(false);
      return;
    }

    const sorted = [...attendanceHistory].sort(
      (a, b) =>
        new Date(b.checkedInAt).getTime() -
        new Date(a.checkedInAt).getTime(),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const previous = new Date(sorted[1].checkedInAt);
    previous.setHours(0, 0, 0, 0);

    const daysSincePrevious = Math.floor(
      (today.getTime() - previous.getTime()) /
        86400000,
    );

    setCanRepairStreak(daysSincePrevious > 1);
  }, [checkedIn, attendanceHistory]);

  const stopQrCamera = () => {
    if (qrFrameRef.current !== null) {
      window.cancelAnimationFrame(qrFrameRef.current);
      qrFrameRef.current = null;
    }

    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
    }

    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  const confirmCheckIn = async () => {
    if (scanning || checkedIn || loggedOut || !qrVerified) return;

    const token = getToken();

    if (!token) {
      toast.error("Please sign in as a member first.", {
        description:
          "QR attendance requires an authenticated member account.",
      });
      return;
    }

    setScanning(true);

    try {
      const response = await fetch(
        "/api/attendance/checkin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to record check-in.",
        );
      }

      setCheckedIn(true);
      setCheckedOut(
        Boolean(data?.attendance?.checkedOutAt),
      );

      if (data?.rewards) {
        setPoints(Number(data.rewards.points || 0));
        setCurrentStreak(
          Number(data.rewards.currentStreak || 0),
        );
        setLongestStreak(
          Number(data.rewards.longestStreak || 0),
        );
      } else if (data?.pointsAwarded) {
        setPoints((value) =>
          value + Number(data.pointsAwarded || 0),
        );
      }

      if (data?.streak) {
        setCurrentStreak(Number(data.streak));
      }

      await loadAttendanceData();

      const awarded = Number(
        data?.pointsAwarded || 0,
      );

      toast.success("Check-in confirmed", {
        description:
          awarded > 0
            ? `Attendance saved. +${awarded} points earned.`
            : data?.message ||
              "Attendance has been saved.",
      });

      setQrVerified(false);
      setQrError("");
    } catch (error) {
      console.error(
        "Check-in request failed:",
        error,
      );

      toast.error("Check-in failed", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to record attendance.",
      });
    } finally {
      setScanning(false);
    }
  };

  const scan = async () => {
    if (scanning || checkedIn || loggedOut) return;

    const token = getToken();

    if (!token) {
      toast.error("Please sign in as a member first.", {
        description:
          "QR attendance requires an authenticated member account.",
      });
      return;
    }

    // If a valid QR was already scanned, the same button now
    // becomes the real check-in action.
    if (qrVerified) {
      await confirmCheckIn();
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      toast.error("Camera access is not available.", {
        description:
          "Open the website on a secure connection and allow camera access.",
      });
      return;
    }

    setQrError("");
    setQrVerified(false);
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      qrStreamRef.current = stream;

      // setScanning(true) renders the <video> element. Wait for that
      // render before reading the video ref.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const video = qrVideoRef.current;

      if (!video) {
        stopQrCamera();
        throw new Error("QR camera could not be opened.");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      let detector: any = null;

      // Use native BarcodeDetector when available. Otherwise use jsQR,
      // which works in browsers where BarcodeDetector is unavailable.
      if (BarcodeDetectorClass) {
        try {
          detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
        } catch (error) {
          console.warn(
            "Native BarcodeDetector unavailable, using jsQR fallback.",
            error,
          );
        }
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!context) {
        stopQrCamera();
        throw new Error("QR camera could not be initialized.");
      }

      let lastScanAt = 0;

      const handleValue = (value: string) => {
        const cleanValue = value.trim();

        if (cleanValue === "PULSEFORGE-GYM-CHECKIN") {
          stopQrCamera();
          setQrError("");
          setQrVerified(true);

          toast.success("Valid gym QR detected", {
            description: "QR verified. You can now check in.",
          });

          return true;
        }

        setQrError(
          "Invalid QR code. Please scan the official PulseForge gym check-in QR.",
        );
        return false;
      };

      const detectQr = async (timestamp = 0) => {
        if (!qrVideoRef.current || !qrStreamRef.current) {
          return;
        }

        // Limit decoding work so the camera preview remains smooth.
        if (timestamp - lastScanAt >= 120) {
          lastScanAt = timestamp;

          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              let detectedValue = "";

              if (detector) {
                try {
                  const codes = await detector.detect(video);
                  if (codes.length > 0) {
                    detectedValue = String(
                      codes[0]?.rawValue || "",
                    );
                  }
                } catch (error) {
                  // If native detection fails, continue with jsQR below.
                  console.warn("Native QR detection failed:", error);
                  detector = null;
                }
              }

              if (!detectedValue) {
                const width = Math.min(video.videoWidth, 960);
                const height = Math.max(
                  1,
                  Math.round(
                    (video.videoHeight / video.videoWidth) * width,
                  ),
                );

                canvas.width = width;
                canvas.height = height;
                context.drawImage(video, 0, 0, width, height);

                const imageData = context.getImageData(
                  0,
                  0,
                  width,
                  height,
                );

                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "attemptBoth",
                  },
                );

                if (code?.data) {
                  detectedValue = code.data;
                }
              }

              if (detectedValue) {
                const accepted = handleValue(detectedValue);
                if (accepted) return;
              }
            }
          } catch (error) {
            console.error("QR detection failed:", error);
          }
        }

        qrFrameRef.current = window.requestAnimationFrame(detectQr);
      };

      qrFrameRef.current = window.requestAnimationFrame(detectQr);
    } catch (error) {
      console.error("Unable to start QR camera:", error);

      stopQrCamera();

      toast.error("Unable to start QR scanner", {
        description:
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access and try again."
            : error instanceof Error
              ? error.message
              : "Please check your camera and try again.",
      });
    }
  };
  useEffect(() => {
    return () => {
      if (qrFrameRef.current !== null) {
        window.cancelAnimationFrame(qrFrameRef.current);
      }

      if (qrStreamRef.current) {
        qrStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  const checkout = async () => {
    if (
      checkoutScanning ||
      !checkedIn ||
      checkedOut ||
      loggedOut
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error("Please sign in as a member first.");
      return;
    }

    // Re-use the same camera QR scanner for checkout.
    // The official PulseForge QR must contain this exact value.
    setQrError("");
    setCheckoutScanning(true);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not available. Open the website on a secure connection and allow camera access.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      qrStreamRef.current = stream;

      // The checkout overlay is rendered after checkoutScanning becomes true.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const video = qrVideoRef.current;

      if (!video) {
        throw new Error("QR camera could not be opened.");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      let detector: any = null;

      if (BarcodeDetectorClass) {
        try {
          detector = new BarcodeDetectorClass({
            formats: ["qr_code"],
          });
        } catch (error) {
          console.warn(
            "Native BarcodeDetector unavailable, using jsQR fallback.",
            error,
          );
        }
      }

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!context) {
        throw new Error("QR camera could not be initialized.");
      }

      let lastScanAt = 0;
      let completed = false;

      const finishCheckout = async () => {
        if (completed) return;
        completed = true;

        if (qrFrameRef.current !== null) {
          window.cancelAnimationFrame(qrFrameRef.current);
          qrFrameRef.current = null;
        }

        if (qrStreamRef.current) {
          qrStreamRef.current
            .getTracks()
            .forEach((track) => track.stop());
          qrStreamRef.current = null;
        }

        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = null;
        }

        setCheckoutScanning(false);

        try {
          const response = await fetch(
            "/api/attendance/checkout",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.message ||
                "Unable to record check-out.",
            );
          }

          setCheckedOut(true);
          await loadAttendanceData();

          toast.success("Check-out confirmed", {
            description:
              "Your check-out time has been saved.",
          });
        } catch (error) {
          console.error(
            "Check-out request failed:",
            error,
          );

          toast.error("Check-out failed", {
            description:
              error instanceof Error
                ? error.message
                : "Unable to record check-out.",
          });
        }
      };

      const detectCheckoutQr = async (timestamp = 0) => {
        if (completed) return;

        if (
          !qrVideoRef.current ||
          !qrStreamRef.current
        ) {
          return;
        }

        if (timestamp - lastScanAt >= 120) {
          lastScanAt = timestamp;

          try {
            if (
              video.readyState >= 2 &&
              video.videoWidth > 0
            ) {
              let detectedValue = "";

              if (detector) {
                try {
                  const codes = await detector.detect(video);

                  if (codes.length > 0) {
                    detectedValue = String(
                      codes[0]?.rawValue || "",
                    );
                  }
                } catch (error) {
                  console.warn(
                    "Native checkout QR detection failed:",
                    error,
                  );
                  detector = null;
                }
              }

              if (!detectedValue) {
                const width = Math.min(
                  video.videoWidth,
                  960,
                );
                const height = Math.max(
                  1,
                  Math.round(
                    (video.videoHeight /
                      video.videoWidth) *
                      width,
                  ),
                );

                canvas.width = width;
                canvas.height = height;

                context.drawImage(
                  video,
                  0,
                  0,
                  width,
                  height,
                );

                const imageData =
                  context.getImageData(
                    0,
                    0,
                    width,
                    height,
                  );

                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "attemptBoth",
                  },
                );

                if (code?.data) {
                  detectedValue = code.data;
                }
              }

              if (detectedValue) {
                const cleanValue =
                  detectedValue.trim();

                if (
                  cleanValue ===
                  "PULSEFORGE-GYM-CHECKIN"
                ) {
                  setQrError("");
                  toast.success(
                    "Valid gym QR detected",
                    {
                      description:
                        "QR verified. Recording your check-out.",
                    },
                  );

                  await finishCheckout();
                  return;
                }

                setQrError(
                  "Invalid QR code. Please scan the official PulseForge gym QR.",
                );
              }
            }
          } catch (error) {
            console.error(
              "Checkout QR detection failed:",
              error,
            );
          }
        }

        qrFrameRef.current =
          window.requestAnimationFrame(
            detectCheckoutQr,
          );
      };

      qrFrameRef.current =
        window.requestAnimationFrame(
          detectCheckoutQr,
        );
    } catch (error) {
      console.error(
        "Unable to start checkout QR camera:",
        error,
      );

      if (qrStreamRef.current) {
        qrStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
        qrStreamRef.current = null;
      }

      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = null;
      }

      setCheckoutScanning(false);

      toast.error("Unable to start checkout scanner", {
        description:
          error instanceof DOMException &&
          error.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access and try again."
            : error instanceof Error
              ? error.message
              : "Please check your camera and try again.",
      });
    }
  };

  const repairStreak = async () => {
    if (repairing) return;

    const token = getToken();

    if (!token) {
      toast.error("Please sign in as a member first.");
      return;
    }

    if (points < repairCost) {
      toast.error(
        `You need ${repairCost} points to repair your streak.`,
      );
      return;
    }

    setRepairing(true);

    try {
      const response = await fetch(
        "/api/rewards/repair-streak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to repair your streak.",
        );
      }

      if (data?.rewards) {
        setPoints(Number(data.rewards.points || 0));
        setCurrentStreak(
          Number(data.rewards.currentStreak || 0),
        );
        setLongestStreak(
          Number(data.rewards.longestStreak || 0),
        );
      }

      await loadAttendanceData();

      setCanRepairStreak(false);

      toast.success("Streak repaired", {
        description: `${repairCost} points used to restore your streak.`,
      });
    } catch (error) {
      console.error(
        "Streak repair failed:",
        error,
      );

      toast.error("Streak repair failed", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to repair streak.",
      });
    } finally {
      setRepairing(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("pulseforge_token");
    localStorage.removeItem("pulseforge_user");
    localStorage.removeItem("pulseforge_role");
    localStorage.removeItem("isLoggedIn");

    window.dispatchEvent(new Event("pulseforge-auth-changed"));
    setLoggedOut(true);
    setCheckedIn(false);
    setCheckedOut(false);
    setScanning(false);
    setCheckoutScanning(false);

    toast.success("Logged out", {
      description:
        "Your PulseForge member session has ended.",
    });
  };

  const formatDate = (value: string | null) => {
    if (!value) return "No expiry date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "No expiry date";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const daysLeft = membershipEndDate
    ? Math.ceil(
        (new Date(membershipEndDate).getTime() -
          new Date().setHours(0, 0, 0, 0)) /
          86400000,
      )
    : null;

  const lastSevenDays = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const found = attendanceHistory.some(
        (record) => {
          const checkInDate = new Date(
            record.checkedInAt,
          );
          checkInDate.setHours(0, 0, 0, 0);

          return (
            checkInDate.getTime() === date.getTime()
          );
        },
      );

      return {
        date,
        found,
        label: date
          .toLocaleDateString("en-IN", {
            weekday: "short",
          })
          .slice(0, 1),
      };
    },
  );

  return (
    <div className="product-frame">
      <div className="browser-chrome">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>

        <span>
          app.pulseforge.fit /{" "}
          {tab === "member"
            ? "my-membership"
            : "owner-dashboard"}
        </span>

        <button
          className="preview-logout"
          onClick={logout}
          aria-label="Log out"
        >
          <LogOut size={12} />
          log out
        </button>

        <LockKeyhole size={12} />
      </div>

      <div className="preview-tabs">

        <button
          className={tab === "member" ? "active" : ""}
          onClick={() => {
            setTab("member");
            setLoggedOut(false);

            if (getToken()) {
              loadAttendanceData();
            }
          }}
        >
          Member view
        </button>

        <span className="preview-secure">
          <ShieldCheck size={13} />
          encrypted
        </span>
      </div>

      {tab === "owner" ? (
        <div className="dashboard-preview">
          <div className="preview-header">
            <div>
              <span className="mini-eyebrow">
                TODAY · 08:42 AM
              </span>

              <h3>Gym attendance</h3>
            </div>

            <div className="mini-avatar">SD</div>
          </div>

          <div className="preview-kpis">
            <div>
              <span>members</span>
              <b>486</b>
            </div>

            <div>
              <span>at risk</span>
              <b className="coral-text">12</b>
            </div>

            <div>
              <span>renewal health</span>
              <b className="lime-text">91%</b>
            </div>
          </div>

          <div className="preview-list">
            <div className="preview-section-title">
              <b>Who to call today</b>
              <span className="list-count">
                3 signals
              </span>
            </div>

            {members.map((member) => (
              <div
                className="mini-member"
                key={member.name}
              >
                <div
                  className={`mini-avatar avatar-${member.color}`}
                >
                  {member.initials}
                </div>

                <span>
                  <b>{member.name}</b>
                  <small>{member.detail}</small>
                </span>

                <button
                  onClick={() =>
                    toast.success(
                      `Follow-up task created for ${member.name}.`,
                    )
                  }
                >
                  <PhoneCall size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : loggedOut ? (
        <div className="member-preview">
          <div className="logged-out-state">
            <div className="logout-icon">
              <LogOut size={20} />
            </div>

            <span className="mini-eyebrow">
              SESSION ENDED
            </span>

            <h3>You’re logged out.</h3>

            <p>
              Sign in again to use attendance,
              points, streaks, and membership data.
            </p>

            <button
              className="demo-relogin"
              onClick={() => {
                setLoggedOut(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
                toast.info(
                  "Use the Sign in button to start a new member session.",
                );
              }}
            >
              Return to sign in
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="member-preview">
          <div className="member-welcome">
            <span className="mini-eyebrow">
              MY MEMBERSHIP
            </span>

            <h3>Welcome, {memberName}</h3>

            <p>
              Attendance, points, streak, and membership
              information.
            </p>
          </div>

          <div className="streak-card">
            <div>
              <span>current streak</span>

              <b>
                {currentStreak} <em>days</em>
              </b>

              <small>
                <Sparkles size={12} />
                {checkedIn
                  ? "Today’s check-in is complete"
                  : "Check in today to keep your streak"}
              </small>
            </div>

            <div className="streak-orb">
              <Activity size={26} />
            </div>
          </div>

          <div className="streak-week">
            <div className="streak-week-head">
              <span>DAILY STREAK</span>

              <b>
                {currentStreak} days
              </b>
            </div>

            <div className="streak-days">
              {lastSevenDays.map(
                (day, index) => (
                  <span
                    key={`${day.date.toISOString()}-${index}`}
                    className={
                      day.found
                        ? "done"
                        : index === 6
                          ? "today"
                          : "next"
                    }
                  >
                    {day.label}
                  </span>
                ),
              )}
            </div>

            <small>
              {checkedIn
                ? "Today’s check-in is complete"
                : "Check in today to keep your streak"}
            </small>
          </div>

          <div className="member-status">
            <div className="status-label">
              <span className="status-pip" />
              active plan
            </div>

            <b>{memberPlan}</b>

            <span>
              {membershipEndDate
                ? `Expires on ${formatDate(
                    membershipEndDate,
                  )}`
                : "Membership expiry not set"}
            </span>

            <div className="status-bar">
              <i
                style={{
                  width:
                    daysLeft !== null
                      ? `${Math.max(
                          5,
                          Math.min(
                            100,
                            (daysLeft / 30) * 100,
                          ),
                        )}%`
                      : "100%",
                }}
              />
            </div>

            <small>
              {daysLeft === null
                ? "Membership active"
                : daysLeft < 0
                  ? "Membership expired"
                  : `${daysLeft} days left`}
            </small>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                padding: "12px",
                border: "1px solid rgba(170,255,0,.18)",
                borderRadius: "10px",
                background:
                  "rgba(170,255,0,.05)",
              }}
            >
              <small
                style={{
                  display: "block",
                  opacity: 0.6,
                  fontSize: "9px",
                  textTransform: "uppercase",
                }}
              >
                points
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  marginTop: "3px",
                }}
              >
                {points}
              </strong>
            </div>

            <div
              style={{
                padding: "12px",
                border: "1px solid rgba(145,100,255,.18)",
                borderRadius: "10px",
                background:
                  "rgba(145,100,255,.05)",
              }}
            >
              <small
                style={{
                  display: "block",
                  opacity: 0.6,
                  fontSize: "9px",
                  textTransform: "uppercase",
                }}
              >
                longest
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  marginTop: "3px",
                }}
              >
                {longestStreak}
              </strong>
            </div>

            <div
              style={{
                padding: "12px",
                border: "1px solid rgba(255,100,80,.18)",
                borderRadius: "10px",
                background:
                  "rgba(255,100,80,.05)",
              }}
            >
              <small
                style={{
                  display: "block",
                  opacity: 0.6,
                  fontSize: "9px",
                  textTransform: "uppercase",
                }}
              >
                check-in
              </small>

              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  marginTop: "3px",
                }}
              >
                +{checkInPoints}
              </strong>
            </div>
          </div>

          <button
            className={`checkin-button ${
              checkedIn ? "checked" : ""
            } ${scanning ? "scanning" : ""}`}
            onClick={scan}
            disabled={
              scanning ||
              checkedIn ||
              loggedOut
            }
          >
            {checkedIn ? (
              <>
                <CircleCheck size={16} />
                Checked in today · +{checkInPoints}
              </>
            ) : scanning ? (
              <>
                <span className="scan-spinner" />
                Scanning QR code...
              </>
            ) : qrVerified ? (
              <>
                <CircleCheck size={16} />
                QR verified · Check in
              </>
            ) : (
              <>
                <ScanLine size={16} />
                Scan QR to check in
              </>
            )}
          </button>

          {checkedIn && !checkedOut && (
            <button
              className={`checkout-button ${
                checkoutScanning
                  ? "scanning"
                  : ""
              }`}
              onClick={checkout}
              disabled={
                checkoutScanning ||
                loggedOut
              }
              style={{
                width: "100%",
                marginTop: "8px",
                minHeight: "46px",
                border:
                  "1px solid rgba(170,255,0,.30)",
                background:
                  "rgba(170,255,0,.07)",
                color: "#b6ff22",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: checkoutScanning
                  ? "wait"
                  : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {checkoutScanning ? (
                <>
                  <span className="scan-spinner" />
                  Scanning checkout QR...
                </>
              ) : (
                <>
                  <QrCode size={16} />
                  Scan QR to check out
                </>
              )}
            </button>
          )}

          {checkedOut && (
            <div
              style={{
                width: "100%",
                marginTop: "8px",
                minHeight: "46px",
                border:
                  "1px solid rgba(170,255,0,.25)",
                background:
                  "rgba(170,255,0,.06)",
                color: "#b6ff22",
                borderRadius: "10px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <CircleCheck size={16} />
              Checked out today
            </div>
          )}

          {scanning && (
            <div className="scan-overlay">
              <video
                ref={qrVideoRef}
                className="qr-camera-preview"
                muted
                playsInline
                style={{
                  position: "absolute",
                  inset: "0",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "inherit",
                  opacity: 0.72,
                  zIndex: 0,
                }}
              />

              <div
                className="scan-corners"
                style={{ zIndex: 2 }}
              >
                <i />
                <i />
                <i />
                <i />
                <span />
              </div>

              <b style={{ zIndex: 2 }}>Align gym QR code</b>
              <small style={{ zIndex: 2 }}>
                Scan the official PulseForge check-in QR
              </small>

              {qrError && (
                <span
                  className="qr-invalid-message"
                  style={{
                    zIndex: 3,
                    color: "#ff8f85",
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "6px 10px",
                    background: "rgba(0,0,0,.72)",
                    borderRadius: "8px",
                  }}
                >
                  {qrError}
                </span>
              )}
            </div>
          )}

          {qrVerified && !checkedIn && (
            <div className="qr-verified-message">
              <CircleCheck size={14} />
              <span>
                <strong>Valid QR verified</strong>
                <small>Press the button above to complete check-in.</small>
              </span>
            </div>
          )}

          {checkoutScanning && (
            <div className="scan-overlay">
              <video
                ref={qrVideoRef}
                className="qr-camera-preview"
                muted
                playsInline
                style={{
                  position: "absolute",
                  inset: "0",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "inherit",
                  opacity: 0.72,
                  zIndex: 0,
                }}
              />

              <div
                className="scan-corners"
                style={{ zIndex: 2 }}
              >
                <i />
                <i />
                <i />
                <i />
                <span />
              </div>

              <b style={{ zIndex: 2 }}>
                Scan gym QR to check out
              </b>

              <small style={{ zIndex: 2 }}>
                Scan the official PulseForge QR code
              </small>

              {qrError && (
                <span
                  className="qr-invalid-message"
                  style={{
                    zIndex: 3,
                    color: "#ff8f85",
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "6px 10px",
                    background: "rgba(0,0,0,.72)",
                    borderRadius: "8px",
                  }}
                >
                  {qrError}
                </span>
              )}
            </div>
          )}
          <div className="streak-repair-panel">
            <div className="streak-repair-copy">
              <div className="streak-repair-icon">
                <Sparkles size={16} />
              </div>
              <div>
                <strong>Streak Repair</strong>
                <small>
                  {canRepairStreak
                    ? `Restore your broken streak for ${repairCost} points.`
                    : checkedIn
                      ? "Your streak is currently protected."
                      : "Check in first. Repair becomes available after a missed day."}
                </small>
              </div>
            </div>

            <button
              type="button"
              className="streak-repair-button"
              onClick={repairStreak}
              disabled={
                repairing ||
                !canRepairStreak ||
                points < repairCost
              }
            >
              {repairing
                ? "Repairing..."
                : canRepairStreak && points >= repairCost
                  ? `Repair · ${repairCost}`
                  : points < repairCost && canRepairStreak
                    ? `Need ${repairCost - points} pts`
                    : "Unavailable"}
            </button>
          </div>

          {canRepairStreak && points < repairCost && (
            <small className="streak-repair-hint">
              You have {points} points. Earn {repairCost - points} more points to repair your streak.
            </small>
          )}

          <p className="member-note">
            <ShieldCheck size={13} />
            {points} points available · +
            {checkInPoints} per daily check-in
          </p>
        </div>
      )}
    </div>
  );
}

type MembershipPlan = {
  _id: string;
  name: string;
  duration: string;
  price: number;
  label: string;
  description: string;
  featured?: boolean;
};

const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    _id: "monthly",
    name: "1 month",
    duration: "1 month",
    price: 999,
    label: "FLEXIBLE",
    description:
      "Short-term gym membership with access to attendance and QR check-in.",
  },
  {
    _id: "six-months",
    name: "6 months",
    duration: "6 months",
    price: 4999,
    label: "CONSISTENT",
    description:
      "Mid-term membership for a steady training routine and attendance streak.",
    featured: true,
  },
  {
    _id: "yearly",
    name: "1 year",
    duration: "1 year",
    price: 7999,
    label: "COMMITTED",
    description:
      "Annual gym membership with a full year of training and member support.",
  },
];

const formatPlanPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

type LoginMode =
  | "choose"
  | "login"
  | "register";

export default function Home() {
  /*
   * Wouter navigation.
   *
   * Used for the Owner Registration button.
   */
  const [, setLocation] = useLocation();

  const [showAll, setShowAll] = useState(false);

  const [email, setEmail] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [membershipPlans, setMembershipPlans] =
    useState<MembershipPlan[]>(
      DEFAULT_MEMBERSHIP_PLANS,
    );

  useEffect(() => {
    let mounted = true;

    const loadMembershipPlans = async () => {
      try {
        const response = await fetch(
          "/api/membership-plans",
        );

        if (!response.ok) {
          throw new Error(
            "Could not load membership plans",
          );
        }

        const data = await response.json();

        if (
          mounted &&
          Array.isArray(data) &&
          data.length > 0
        ) {
          setMembershipPlans(data);
        }
      } catch {
        if (mounted) {
          setMembershipPlans(
            DEFAULT_MEMBERSHIP_PLANS,
          );
        }
      }
    };

    loadMembershipPlans();

    const refreshPlans = () =>
      loadMembershipPlans();

    window.addEventListener(
      "pulseforge-membership-plans-updated",
      refreshPlans,
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "pulseforge-membership-plans-updated",
        refreshPlans,
      );
    };
  }, []);

  const [showLogin, setShowLogin] =
    useState(false);

  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    const loadSession = () => {
      try {
        const token = localStorage.getItem("pulseforge_token");
        const rawUser = localStorage.getItem("pulseforge_user");
        setSessionUser(token && rawUser ? JSON.parse(rawUser) : null);
      } catch {
        setSessionUser(null);
      }
    };

    loadSession();
    window.addEventListener("pulseforge-auth-changed", loadSession);
    return () => {
      window.removeEventListener("pulseforge-auth-changed", loadSession);
    };
  }, []);

  const [memberName, setMemberName] = useState("Member");
  const [memberPlan, setMemberPlan] = useState("Membership plan");
  const [membershipEndDate, setMembershipEndDate] = useState<string | null>(null);

  const [membershipHistory, setMembershipHistory] = useState<
    Array<{
      _id: string;
      planName: string;
      amount: number;
      paymentMethod: string;
      paidAt: string;
      membershipStartDate: string;
      membershipEndDate: string;
      note?: string;
    }>
  >([]);

  const [showMembershipHistory, setShowMembershipHistory] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [loadingMembershipHistory, setLoadingMembershipHistory] = useState(false);

  const getToken = () => localStorage.getItem("pulseforge_token");

  const loadMembershipHistory = async () => {
    const token = getToken();
    if (!token) return;

    setLoadingMembershipHistory(true);
    try {
      const response = await fetch("/api/membership/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load membership history.");
      }

      setMembershipHistory(Array.isArray(data?.history) ? data.history : []);

      if (data?.member) {
        setMemberName(data.member.name || "Member");
        setMemberPlan(data.member.membershipPlan || "Membership plan");
        setMembershipEndDate(data.member.membershipEndDate || null);
      }
    } catch (error) {
      console.error("Membership history error:", error);
      toast.error("Unable to load membership history", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoadingMembershipHistory(false);
    }
  };

  const loadMembershipStatus = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch("/api/membership/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;
      const data = await response.json();

      if (data?.member) {
        setMemberName(data.member.name || "Member");
        setMemberPlan(data.member.membershipPlan || "Membership plan");
        setMembershipEndDate(data.member.membershipEndDate || null);

        const end = data.member.membershipEndDate
          ? new Date(data.member.membershipEndDate)
          : null;

        if (end && !Number.isNaN(end.getTime())) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const remaining = Math.ceil((end.getTime() - start.getTime()) / 86400000);
          if (remaining >= 0 && remaining <= 7) {
            setShowExpiryWarning(true);
          }
        }
      }
    } catch (error) {
      console.error("Membership status error:", error);
    }
  };

  useEffect(() => {
    if (sessionUser?.role === "member") {
      loadMembershipStatus();
    }
  }, [sessionUser?.role]);

  const [loginType, setLoginType] = useState<
    "owner" | "member" | null
  >(null);

  const [loginMode, setLoginMode] =
    useState<LoginMode>("choose");

  const [loginEmail, setLoginEmail] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");

  const [isLoggingIn, setIsLoggingIn] =
    useState(false);

  const [isRegistering, setIsRegistering] =
    useState(false);


  const [registerName, setRegisterName] =
    useState("");

  const [registerEmail, setRegisterEmail] =
    useState("");

  const [registerPassword, setRegisterPassword] =
    useState("");

  const [
    registerConfirmPassword,
    setRegisterConfirmPassword,
  ] = useState("");

  const openLogin = () => {
    setShowLogin(true);
    setLoginMode("choose");
    setLoginType(null);
  };

  const closeLogin = () => {
    setShowLogin(false);
    setLoginMode("choose");
    setLoginType(null);

    setLoginEmail("");
    setLoginPassword("");


    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");

    setIsLoggingIn(false);
    setIsRegistering(false);
  };

  const chooseLoginType = (
    type: "owner" | "member",
  ) => {
    setLoginType(type);
    setLoginMode("login");
    setLoginEmail("");
    setLoginPassword("");
  };

  const goBackToChoose = () => {
    setLoginMode("choose");
    setLoginType(null);
  };


  /* =========================================================
     REAL LOGIN - CONNECTED TO MONGODB BACKEND
  ========================================================= */

  const handleLogin = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!loginType) {
      toast.error(
        "Please select Owner or Member.",
      );
      return;
    }

    if (!loginEmail.includes("@")) {
      toast.error(
        "Enter a valid email address.",
      );
      return;
    }

    if (loginPassword.length < 6) {
      toast.error(
        "Password must contain at least 6 characters.",
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: loginEmail.trim(),
            password: loginPassword,
            role: loginType,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Login failed. Please try again.",
        );
      }

      localStorage.setItem(
        "pulseforge_token",
        data.token,
      );

      localStorage.setItem(
        "pulseforge_user",
        JSON.stringify(data.user),
      );

      localStorage.setItem(
        "pulseforge_role",
        data.user.role,
      );

      localStorage.setItem(
        "isLoggedIn",
        "true",
      );

      setSessionUser(data.user);
      window.dispatchEvent(new Event("pulseforge-auth-changed"));

      toast.success("Login successful", {
        description: `Welcome back, ${data.user.name}.`,
      });

      /*
       * OWNER LOGIN
       */
      if (data.user.role === "owner") {
        window.location.href = "/admin";
        return;
      }

      /*
       * MEMBER LOGIN
       */
      setShowLogin(false);

      setLoginEmail("");
      setLoginPassword("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Login request failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to login.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  /* =========================================================
     REAL REGISTER - CONNECTED TO MONGODB BACKEND
  ========================================================= */

  const handleRegister = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (
      registerName.trim().length < 2
    ) {
      toast.error(
        "Enter your full name.",
      );
      return;
    }

    if (!registerEmail.includes("@")) {
      toast.error(
        "Enter a valid email address.",
      );
      return;
    }

    if (registerPassword.length < 6) {
      toast.error(
        "Password must contain at least 6 characters.",
      );
      return;
    }

    if (
      registerPassword !==
      registerConfirmPassword
    ) {
      toast.error(
        "Passwords do not match.",
      );
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: registerName.trim(),
            email: registerEmail.trim(),
            password: registerPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Registration failed. Please try again.",
        );
      }

      localStorage.setItem(
        "pulseforge_token",
        data.token,
      );

      localStorage.setItem(
        "pulseforge_user",
        JSON.stringify(data.user),
      );

      localStorage.setItem(
        "pulseforge_role",
        data.user.role,
      );

      localStorage.setItem(
        "isLoggedIn",
        "true",
      );

      setSessionUser(data.user);
      window.dispatchEvent(new Event("pulseforge-auth-changed"));

      toast.success(
        "Account created successfully",
        {
          description: `Welcome to PulseForge, ${data.user.name}.`,
        },
      );

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");

      setShowLogin(false);
      setLoginMode("choose");
      setLoginType(null);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Registration request failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create account.",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "No expiry date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No expiry date";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const daysLeft = membershipEndDate
    ? Math.ceil(
        (new Date(membershipEndDate).getTime() -
          new Date().setHours(0, 0, 0, 0)) /
          86400000,
      )
    : null;

  return (
    <main
      id="top"
      className="site-shell"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.42) 35%, rgba(0,0,0,.72) 100%), url("/gym-background.JPG")',
        backgroundSize: "100% 100%",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll",
      }}
    >

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="top-nav">
        <Logo />

        <div className="nav-links">
          <a href="#attendance">
            Attendance
          </a>

          <a href="#plans">
            Plans
          </a>

          <a href="#privacy">
            Privacy
          </a>
        </div>

        <div className="nav-actions">
          {sessionUser ? (
            <button
              className="nav-login"
              onClick={() => {
                if (sessionUser.role === "owner") {
                  window.location.href = "/admin";
                } else {
                  document.getElementById("member-dashboard")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }
              }}
            >
              {sessionUser.role === "owner" ? "Admin Dashboard" : "Member Dashboard"}
              <ArrowUpRight size={15} />
            </button>
          ) : (
            <button
              className="nav-login"
              onClick={openLogin}
            >
              Sign in
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </nav>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="hero-section"
        style={{
          backgroundImage:
            'linear-gradient(rgba(9,10,11,.68), rgba(9,10,11,.68)), url("/gym-background.png")',
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="hero-copy">
          <div className="eyebrow eyebrow-pulse">
            <span className="pulse-orb" />
            gym membership and attendance
          </div>

          <h1>
            Gym
            <br />
            <span>information.</span>
          </h1>

          <p className="hero-lede">
            View membership status, attendance, QR
            check-in, expiry dates, and follow-up records
            in one place.
          </p>

          <div className="hero-proof">
            <span>
              <b>486 members</b> · live gym record
            </span>
          </div>
        </div>

        <GymScene />
      </section>

      {/* =====================================================
          TICKER
      ===================================================== */}

      <div className="ticker">
        <span>
          <QrCode size={13} />
          QR check-in
        </span>

        <span>
          Membership status
        </span>

        <span>
          Attendance records
        </span>

        <span>
          Expiry warnings
        </span>

        <span>
          No payment data
        </span>

        <span>
          <ShieldCheck size={13} />
          secure access
        </span>
      </div>

      {/* =====================================================
          ATTENDANCE
      ===================================================== */}

      <section
        id="attendance"
        className="section-block system-section attendance-layout-section"
        style={{ background: "transparent" }}
      >
        <img
          className="section-background-image"
          src="/attendance-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
        />
        <div className="section-intro">
          <div>
            <p className="eyebrow">
              gym dashboard
            </p>

            <h2>
              Attendance
              <br />
              <i>information.</i>
            </h2>
          </div>

          <div className="intro-aside">
            <span className="aside-number">
              01
            </span>

            <p>
              Check-ins are recorded by date and time.
              Members can check in with a QR code or staff
              assistance.
            </p>
          </div>
        </div>

        <div className="signal-grid">
          <article className="signal-card signal-lime">
            <div className="signal-topline">
              <div className="signal-icon">
                <QrCode size={19} />
              </div>

              <span className="signal-tag">
                CHECK-IN
              </span>
            </div>

            <p className="eyebrow">
              attendance
            </p>

            <h3>QR check-in</h3>

            <p className="signal-copy">
              Record the member, check-in time, and
              attendance streak.
            </p>
          </article>

          <button
            type="button"
            className="signal-card signal-coral signal-card-button"
            onClick={() => {
              if (sessionUser?.role === "member") {
                setShowExpiryWarning(true);
              } else {
                toast.info("Member login required", {
                  description:
                    "Sign in as a member to view your membership expiry.",
                });
              }
            }}
          >
            <div className="signal-topline">
              <div className="signal-icon">
                <BellRing size={19} />
              </div>

              <span className="signal-tag">
                EXPIRY
              </span>
            </div>

            <p className="eyebrow">
              membership
            </p>

            <h3>Expiry warning</h3>

            <p className="signal-copy">
              Show plans expiring in 7 days or less to
              staff and members.
            </p>

            <span className="signal-card-action">
              {sessionUser?.role === "member"
                ? "View expiry →"
                : "Member login required →"}
            </span>
          </button>

          <button
            type="button"
            className="signal-card signal-violet signal-card-button"
            onClick={async () => {
              if (sessionUser?.role !== "member") {
                toast.info("Member login required", {
                  description:
                    "Sign in as a member to view your membership history.",
                });
                return;
              }

              setShowMembershipHistory(true);
              await loadMembershipHistory();
            }}
          >
            <div className="signal-topline">
              <div className="signal-icon">
                <Database size={19} />
              </div>

              <span className="signal-tag">
                HISTORY
              </span>
            </div>

            <p className="eyebrow">
              extensions
            </p>

            <h3>Membership history</h3>

            <p className="signal-copy">
              Record the previous date, new date, staff
              member, and note.
            </p>

            <span className="signal-card-action">
              {sessionUser?.role === "member"
                ? "View history →"
                : "Member login required →"}
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================
          MEMBER MEMBERSHIP HISTORY
      ===================================================== */}
      {showMembershipHistory && sessionUser?.role === "member" && (
        <div
          className="member-history-overlay"
          onClick={() => setShowMembershipHistory(false)}
        >
          <div
            className="member-history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="member-history-header">
              <div>
                <p className="eyebrow">MEMBERSHIP</p>
                <h2>Membership history</h2>
                <p>
                  Your membership payments and plan extensions
                  recorded by the gym owner.
                </p>
              </div>

              <button
                type="button"
                className="member-history-close"
                onClick={() => setShowMembershipHistory(false)}
                aria-label="Close membership history"
              >
                ×
              </button>
            </div>

            <div className="member-history-current">
              <div>
                <span>Current plan</span>
                <strong>{memberPlan || "No plan"}</strong>
              </div>
              <div>
                <span>Current expiry</span>
                <strong>{formatDate(membershipEndDate)}</strong>
              </div>
            </div>

            {loadingMembershipHistory ? (
              <div className="member-history-empty">
                Loading membership history...
              </div>
            ) : membershipHistory.length === 0 ? (
              <div className="member-history-empty">
                No membership payment or extension records are available yet.
              </div>
            ) : (
              <div className="member-history-list">
                {membershipHistory.map((item) => (
                  <div
                    className="member-history-item"
                    key={item._id}
                  >
                    <div className="member-history-plan">
                      <strong>{item.planName}</strong>
                      <span>
                        {formatDate(item.membershipStartDate)}
                        {" → "}
                        {formatDate(item.membershipEndDate)}
                      </span>
                    </div>

                    <div className="member-history-payment">
                      <strong>₹{Number(item.amount || 0).toLocaleString("en-IN")}</strong>
                      <span>
                        {String(item.paymentMethod || "cash")
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>

                    <div className="member-history-date">
                      <span>Paid</span>
                      <strong>
                        {new Date(item.paidAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </strong>
                    </div>

                    {item.note && (
                      <div className="member-history-note">
                        {item.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MEMBERSHIP EXPIRY WARNING
      ===================================================== */}
      {showExpiryWarning && sessionUser?.role === "member" && (
        <div
          className="member-expiry-overlay"
          onClick={() => setShowExpiryWarning(false)}
        >
          <div
            className="member-expiry-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="member-expiry-icon">
              <BellRing size={25} />
            </div>

            <p className="eyebrow">MEMBERSHIP EXPIRY</p>

            <h2>
              {daysLeft === 0
                ? "Your membership expires today"
                : daysLeft === 1
                  ? "Your membership expires tomorrow"
                  : `Your membership expires in ${daysLeft ?? 0} days`}
            </h2>

            <p>
              Your <strong>{memberPlan || "membership plan"}</strong>{" "}
              expires on{" "}
              <strong>{formatDate(membershipEndDate)}</strong>.
              Please contact the gym owner to renew or extend your plan.
            </p>

            <div className="member-expiry-actions">
              <button
                type="button"
                onClick={() => setShowExpiryWarning(false)}
              >
                Close
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowExpiryWarning(false);
                  setShowMembershipHistory(true);
                  await loadMembershipHistory();
                }}
              >
                View membership history
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionUser?.role === "member" && (
        <section
          id="member-dashboard"
          className="section-block system-section member-dashboard-section member-dashboard-premium"
        >
          <MemberPanel />
        </section>
      )}

      {/* =====================================================
          PLANS
      ===================================================== */}

      <section
        id="plans"
        className="plans-section plans-layout-section"
        style={{ background: "transparent" }}
      >
        <img
          className="section-background-image"
          src="/plans-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <div className="plans-heading">
          <div>
            <p className="eyebrow">
              membership plans
            </p>

            <h2>
              Choose your
              <br />
              <i>membership.</i>
            </h2>
          </div>

          <p>
            View the available gym membership plans,
            durations, and current pricing.
            Prices are updated by the gym admin.
          </p>
        </div>

        <div className="plans-grid">
          {membershipPlans.map(
            (plan, index) => (
              <article
                className={`plan-card ${
                  plan.featured
                    ? "plan-featured"
                    : ""
                }`}
                key={plan._id}
              >
                <span className="plan-index">
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>

                <span className="plan-label">
                  {plan.label}
                </span>

                <h3>{plan.name}</h3>

                <div className="plan-price">
                  {formatPlanPrice(
                    plan.price,
                  )}
                </div>

                <span className="plan-duration">
                  {plan.duration}
                </span>

                <p>
                  {plan.description}
                </p>

                <a
                  href="#access"
                  onClick={(e) => {
                    e.preventDefault();

                    toast.info(
                      `Contact the gym to join the ${plan.name} plan.`,
                    );
                  }}
                >
                  Ask about this plan
                  <ArrowUpRight size={14} />
                </a>
              </article>
            ),
          )}
        </div>
      </section>

      {/* =====================================================
          BOOKING
      ===================================================== */}

      <BookingSection />

      {/* =====================================================
          MEMBERSHIP
      ===================================================== */}

      <section
        id="membership"
        className="section-block data-section membership-layout-section"
        style={{ background: "transparent" }}
      >
        <img
          className="section-background-image"
          src="/membership-bg.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <div className="data-copy">
          <p className="eyebrow">
            membership information
          </p>

          <h2>
            Plan
            <br />
            <i>status.</i>
          </h2>

          <p>
            Membership plans show their current status
            automatically: Active, Expiring Soon,
            Expired, or Extended.
          </p>

          <div className="data-points">
            <div>
              <span className="point-icon point-lime">
                <Activity size={15} />
              </span>

              <span>
                <b>Active</b>

                <small>
                  Current membership plan
                </small>
              </span>
            </div>

            <div>
              <span className="point-icon point-coral">
                <BellRing size={15} />
              </span>

              <span>
                <b>Expiring soon</b>

                <small>
                  7 days or less remaining
                </small>
              </span>
            </div>

            <div>
              <span className="point-icon point-violet">
                <ShieldCheck size={15} />
              </span>

              <span>
                <b>Extended</b>

                <small>
                  Updated by owner or staff
                </small>
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* =====================================================
          PRIVACY
      ===================================================== */}

      <section
        id="privacy"
        className="privacy-section"
      >
        <div className="privacy-stamp">
          <EyeOff size={30} />

          <span>
            privacy
            <br />
            first
          </span>
        </div>

        <div>
          <p className="eyebrow">
            privacy policy
          </p>

          <h2>
            Information
            <br />
            <i>we store.</i>
          </h2>

          <p>
            Name, phone number, membership plan and dates,
            attendance, extension history, support notes,
            and communication preferences. No card, UPI,
            bank, health, biometric, or government ID data.
          </p>

          <a
            href="/privacy"
            className="privacy-link"
          >
            Read privacy policy
            <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="privacy-facts">
          <div>
            <LockKeyhole size={16} />

            <span>
              <b>Role-restricted</b> access
            </span>
          </div>

          <div>
            <Database size={16} />

            <span>
              <b>Logged</b> sensitive actions
            </span>
          </div>

          <div>
            <ShieldCheck size={16} />

            <span>
              <b>Encrypted</b> traffic
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          GYM LOCATION & HOURS
      ===================================================== */}

      <section
        id="access"
        className="cta-section"
        style={{
          background: "transparent",
          padding: "clamp(32px, 5vw, 72px) 0",
        }}
      >
        <div
          className="cta-content"
          style={{
            width: "min(1120px, 92vw)",
            margin: "0 auto",
          }}
        >
          <div className="eyebrow">
            <span className="pulse-orb" />
            gym information
          </div>

          <h2>
            Find the gym
            <br />
            <i>and hours.</i>
          </h2>

          <p>
            Visit New Power Gym and check the weekly opening hours
            before your workout.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "16px",
              marginTop: "28px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(170,255,0,.18)",
                background: "rgba(10,14,10,.72)",
                borderRadius: "14px",
                padding: "22px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <MapPin size={19} />
                <strong>Gym location</strong>
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "22px",
                }}
              >
                New Power Gym
              </h3>

              <p
                style={{
                  margin: "0 0 18px",
                  lineHeight: 1.6,
                }}
              >
                Bengaluru, Karnataka
              </p>

              <a
                href="https://www.google.com/maps/place/New+Power+Gym/@13.0497832,77.7203031,20.78z/data=!4m6!3m5!1s0x3bae106d1c44320d:0x4cefa74ae2ae2457!8m2!3d13.0497875!4d77.7202969!16s%2Fg%2F11gcbr0hj4?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  background: "#aaff00",
                  color: "#080b08",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Open in Google Maps
                <ArrowUpRight size={14} />
              </a>
            </div>

            <div
              style={{
                border: "1px solid rgba(170,255,0,.18)",
                background: "rgba(10,14,10,.72)",
                borderRadius: "14px",
                padding: "22px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <Clock3 size={19} />
                <strong>Gym hours</strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "9px",
                }}
              >
                {[
                  ["Saturday", "5:30 am–12 pm", "4–9 pm"],
                  ["Sunday", "Closed", ""],
                  ["Monday", "5:30 am–12 pm", "4–9 pm"],
                  ["Tuesday", "5:30 am–12 pm", "4–9 pm"],
                  ["Wednesday", "5:30 am–12 pm", "4–9 pm"],
                  ["Thursday", "5:30 am–12 pm", "4–9 pm"],
                  ["Friday", "5:30 am–12 pm", "4–9 pm"],
                ].map(([day, morning, evening]) => (
                  <div
                    key={day}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(82px, .7fr) 1fr",
                      gap: "12px",
                      alignItems: "start",
                      paddingBottom: "7px",
                      borderBottom:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <strong>{day}</strong>
                    <span>
                      {morning}
                      {evening && (
                        <>
                          <br />
                          {evening}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="site-footer">
        <Logo />

        <div className="footer-links">
          <a href="#attendance">
            Attendance
          </a>

          <a href="#booking">
            Booking
          </a>

          <a href="/privacy">
            Privacy policy
          </a>
        </div>

        <div className="footer-meta">
          <span>
            © 2025 PulseForge
          </span>

          <span className="footer-status">
            <i />
            secure
          </span>
        </div>
      </footer>

      {/* =====================================================
          LOGIN MODAL
      ===================================================== */}

      {showLogin && (
        <div
          className="login-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeLogin();
            }
          }}
        >
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
          >
            {/* CLOSE */}

            <button
              type="button"
              className="login-close"
              onClick={closeLogin}
              aria-label="Close login"
            >
              <X size={20} />
            </button>

            {/* =================================================
                CHOOSE OWNER / MEMBER
            ================================================= */}

            {loginMode === "choose" && (
              <>
                <div className="login-modal-header">
                  <span className="mini-eyebrow">
                    PULSEFORGE ACCESS
                  </span>

                  <h2 id="login-title">
                    Sign in
                    <br />
                    <i>
                      to continue.
                    </i>
                  </h2>

                  <p className="login-description">
                    Choose how you want to access
                    PulseForge.
                  </p>
                </div>

                <div className="login-choice-list">
                  {/* OWNER */}

                  <button
                    type="button"
                    className="login-choice"
                    onClick={() =>
                      chooseLoginType(
                        "owner",
                      )
                    }
                  >
                    <ShieldCheck size={25} />

                    <span className="login-choice-content">
                      <span className="login-choice-title">
                        Owner Login
                      </span>

                      <span className="login-choice-text">
                        Manage members, attendance,
                        bookings and gym records.
                      </span>
                    </span>

                    <ArrowUpRight
                      className="login-choice-arrow"
                      size={18}
                    />
                  </button>

                  {/* MEMBER */}

                  <button
                    type="button"
                    className="login-choice"
                    onClick={() =>
                      chooseLoginType(
                        "member",
                      )
                    }
                  >
                    <UserRound size={25} />

                    <span className="login-choice-content">
                      <span className="login-choice-title">
                        Member Login
                      </span>

                      <span className="login-choice-text">
                        View membership, attendance,
                        bookings and QR check-in.
                      </span>
                    </span>

                    <ArrowUpRight
                      className="login-choice-arrow"
                      size={18}
                    />
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                LOGIN FORM
            ================================================= */}

            {loginMode === "login" && (
              <>
                <button
                  type="button"
                  className="login-back"
                  onClick={
                    goBackToChoose
                  }
                  disabled={
                    isLoggingIn
                  }
                >
                  <ArrowLeft size={15} />
                  Back
                </button>

                <div className="login-modal-header">
                  <span className="mini-eyebrow">
                    {loginType ===
                    "owner"
                      ? "OWNER ACCESS"
                      : "MEMBER ACCESS"}
                  </span>

                  <h2 id="login-title">
                    {loginType ===
                    "owner"
                      ? "Owner"
                      : "Member"}{" "}
                    <i>
                      login.
                    </i>
                  </h2>

                  <p className="login-description">
                    Enter your email and password to
                    continue.
                  </p>
                </div>

                <form
                  className="login-form"
                  onSubmit={
                    handleLogin
                  }
                >
                  <label>
                    Email address

                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={
                        loginEmail
                      }
                      onChange={(e) =>
                        setLoginEmail(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="email"
                      disabled={
                        isLoggingIn
                      }
                    />
                  </label>

                  <label>
                    Password

                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={
                        loginPassword
                      }
                      onChange={(e) =>
                        setLoginPassword(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="current-password"
                      disabled={
                        isLoggingIn
                      }
                    />
                  </label>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={
                      isLoggingIn
                    }
                  >
                    {isLoggingIn ? (
                      <>
                        <span className="scan-spinner" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowUpRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* =================================================
                    OWNER REGISTRATION BUTTON
                ================================================= */}

                {loginType === "owner" && (
                  <div className="register-section">
                    <span>
                      Don't have an owner account?
                    </span>

                    <button
                      type="button"
                      className="register-button"
                      onClick={() =>
                        setLocation(
                          "/owner-register",
                        )
                      }
                      disabled={
                        isLoggingIn
                      }
                    >
                      <UserPlus size={15} />
                      Create Owner Account
                    </button>
                  </div>
                )}

                {/* =================================================
                    MEMBER REGISTRATION BUTTON
                ================================================= */}

                {loginType === "member" && (
                  <div className="register-section">
                    <span>
                      Contact gym owner for register.
                    </span>
                  </div>
                )}
              </>
            )}

            {/* =================================================
                REGISTER MEMBER
            ================================================= */}

            {loginMode ===
              "register" && (
              <>
                <button
                  type="button"
                  className="login-back"
                  onClick={() => {
                    setLoginMode("login");
                    setLoginEmail("");
                    setLoginPassword("");
                  }}
                  disabled={
                    isRegistering
                  }
                >
                  <ArrowLeft size={15} />
                  Back to login
                </button>

                <div className="login-modal-header">
                  <span className="mini-eyebrow">
                    MEMBER REGISTRATION
                  </span>

                  <h2>
                    Create
                    <br />
                    <i>
                      account.
                    </i>
                  </h2>

                  <p className="login-description">
                    Register as a PulseForge gym
                    member.
                  </p>
                </div>

                <form
                  className="login-form"
                  onSubmit={
                    handleRegister
                  }
                >
                  <label>
                    Full name

                    <input
                      type="text"
                      placeholder="Your full name"
                      value={
                        registerName
                      }
                      onChange={(e) =>
                        setRegisterName(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="name"
                      disabled={
                        isRegistering
                      }
                    />
                  </label>

                  <label>
                    Email address

                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={
                        registerEmail
                      }
                      onChange={(e) =>
                        setRegisterEmail(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="email"
                      disabled={
                        isRegistering
                      }
                    />
                  </label>

                  <label>
                    Password

                    <input
                      type="password"
                      placeholder="Create a password"
                      value={
                        registerPassword
                      }
                      onChange={(e) =>
                        setRegisterPassword(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="new-password"
                      disabled={
                        isRegistering
                      }
                    />
                  </label>

                  <label>
                    Confirm password

                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={
                        registerConfirmPassword
                      }
                      onChange={(e) =>
                        setRegisterConfirmPassword(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="new-password"
                      disabled={
                        isRegistering
                      }
                    />
                  </label>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={
                      isRegistering
                    }
                  >
                    {isRegistering ? (
                      <>
                        <span className="scan-spinner" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create account
                        <UserPlus size={16} />
                      </>
                    )}
                  </button>
                </form>

                <p className="login-helper">
                  Your member account is securely
                  stored in MongoDB. Passwords are
                  hashed before storage.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}