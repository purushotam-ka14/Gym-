import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  ChevronDown,
  Download,
  Filter,
  LogOut,
  Pencil,
  PhoneCall,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  detail: string;
  tone: string;
  initials: string;
  membershipStartDate?: string | null;
  membershipEndDate?: string | null;
  lastCheckIn?: string | null;
};

type Dashboard = {
  totalMembers: number;
  checkinsToday: number;
  checkinsYesterday: number;
  expiringMembers: number;
  expiredMembers: number;
  activeMembers: number;
  activeHealth: number;
  daily: { date: string; label: string; count: number }[];
  followUps: Member[];
};

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

const emptyPlan = {
  name: "",
  duration: "",
  price: "",
  label: "NEW PLAN",
  description: "",
  featured: false,
};

const emptyMember = {
  name: "",
  email: "",
  phone: "",
  password: "",
  membershipPlan: "",
  membershipStartDate: "",
  membershipEndDate: "",
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

function toDateInput(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function addPlanDuration(startValue: string, duration: string) {
  if (!startValue || !duration) return "";

  const date = new Date(`${startValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  const matches = [
    ...String(duration)
      .toLowerCase()
      .matchAll(
        /(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)/g,
      ),
  ];

  if (!matches.length) return "";

  for (const match of matches) {
    const value = Number(match[1]);
    const unit = match[2];

    if (unit.startsWith("year")) {
      date.setFullYear(date.getFullYear() + value);
    } else if (unit.startsWith("month")) {
      date.setMonth(date.getMonth() + value);
    } else if (unit.startsWith("week")) {
      date.setDate(date.getDate() + value * 7);
    } else {
      date.setDate(date.getDate() + value);
    }
  }

  return toDateInput(date);
}

function getToken() {
  return localStorage.getItem("pulseforge_token");
}

function authHeaders() {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function percentChange(current: number, previous: number) {
  return previous > 0
    ? Math.round(((current - previous) / previous) * 100)
    : 0;
}

function downloadCsv(rows: Member[]) {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Plan",
    "Status",
    "Last activity",
  ];

  const body = rows.map((r) => [
    r.name,
    r.email,
    r.phone,
    r.plan,
    r.status,
    r.detail,
  ]);

  const csv = [header, ...body]
    .map((row) =>
      row
        .map(
          (v) => `"${String(v ?? "").replaceAll('"', '""')}"`,
        )
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "pulseforge-members.csv";
  a.click();

  URL.revokeObjectURL(url);
}

export default function Admin() {
  const [, setLocation] = useLocation();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All members");
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<MembershipPlan[]>(
    DEFAULT_MEMBERSHIP_PLANS,
  );

  const [loadingPlans, setLoadingPlans] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [savingMember, setSavingMember] = useState(false);

  // Owner password change
  const [showMemberPasswordForm, setShowMemberPasswordForm] =
    useState(false);

  const [memberNewPassword, setMemberNewPassword] = useState("");
  const [memberConfirmPassword, setMemberConfirmPassword] =
    useState("");

  const [savingMemberPassword, setSavingMemberPassword] =
    useState(false);

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [showMembershipExtension, setShowMembershipExtension] =
    useState(false);

  const [extensionPlanId, setExtensionPlanId] = useState("");
  const [extensionStartDate, setExtensionStartDate] =
    useState("");

  const [extensionPaymentMethod, setExtensionPaymentMethod] =
    useState("cash");

  const [extensionAmount, setExtensionAmount] = useState("");
  const [extensionNote, setExtensionNote] = useState("");

  const [savingExtension, setSavingExtension] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("pulseforge_user") || "null",
      ) as { name?: string; role?: string } | null;
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = async () => {
    const response = await fetch("/api/admin/dashboard", {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      localStorage.clear();
      setLocation("/");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load dashboard",
      );
    }

    setDashboard(data);
  };

  const loadMembers = async () => {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (filter !== "All members") {
      params.set("status", filter);
    }

    const response = await fetch(
      `/api/admin/members?${params}`,
      {
        headers: authHeaders(),
      },
    );

    if (response.status === 401) {
      localStorage.clear();
      setLocation("/");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load members",
      );
    }

    setMembers(Array.isArray(data) ? data : []);
  };

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);

      const response = await fetch(
        "/api/membership-plans",
      );

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        setPlans(data);
      } else {
        throw new Error();
      }
    } catch {
      toast.error(
        "Could not load membership plans",
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadDashboard(),
        loadMembers(),
        loadPlans(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      currentUser?.role !== "owner" ||
      !getToken()
    ) {
      setLocation("/");
      return;
    }

    refresh();
  }, []);

  useEffect(() => {
    if (currentUser?.role === "owner") {
      const timer = window.setTimeout(
        () =>
          loadMembers().catch(
            () => undefined,
          ),
        250,
      );

      return () =>
        window.clearTimeout(timer);
    }
  }, [query, filter]);

  const openAddPlan = () => {
    setEditingId(null);
    setPlanForm(emptyPlan);
    setShowPlanForm(true);
  };

  const openEditPlan = (
    plan: MembershipPlan,
  ) => {
    setEditingId(plan._id);

    setPlanForm({
      name: plan.name,
      duration: plan.duration,
      price: String(plan.price),
      label: plan.label,
      description: plan.description,
      featured: Boolean(plan.featured),
    });

    setShowPlanForm(true);
  };

  const closePlanForm = () => {
    if (savingPlan) return;

    setEditingId(null);
    setShowPlanForm(false);
    setPlanForm(emptyPlan);
  };

  const handleSavePlan = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const price = Number(planForm.price);

    if (
      !planForm.name.trim() ||
      !planForm.duration.trim() ||
      !planForm.description.trim() ||
      !planForm.label.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      toast.error(
        "Fill every membership field correctly.",
      );

      return;
    }

    try {
      setSavingPlan(true);

      const response = await fetch(
        editingId
          ? `/api/membership-plans/${editingId}`
          : "/api/membership-plans",
        {
          method: editingId ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },

          body: JSON.stringify({
            ...planForm,
            name: planForm.name.trim(),
            duration: planForm.duration.trim(),
            label: planForm.label.trim(),
            description:
              planForm.description.trim(),
            price,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not save plan",
        );
      }

      setPlans((current) =>
        editingId
          ? current.map((p) =>
              p._id === editingId
                ? data
                : p,
            )
          : [...current, data],
      );

      closePlanForm();

      toast.success(
        editingId
          ? "Membership plan updated"
          : "Membership plan added",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save plan",
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (
    plan: MembershipPlan,
  ) => {
    if (
      !window.confirm(
        `Delete the "${plan.name}" membership plan?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/membership-plans/${plan._id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not delete plan",
        );
      }

      setPlans((current) =>
        current.filter(
          (p) => p._id !== plan._id,
        ),
      );

      toast.success(
        "Membership plan deleted",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete plan",
      );
    }
  };

  /*
   * MEMBER CREATION
   *
   * OTP HAS BEEN COMPLETELY REMOVED.
   *
   * WhatsApp is manual:
   * 1. Owner creates member.
   * 2. Backend creates a wa.me URL.
   * 3. WhatsApp opens with prepared message.
   * 4. Owner manually presses Send.
   */
  const handleAddMember = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const phone = memberForm.phone.trim();

    if (
      !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(
        phone,
      )
    ) {
      toast.error(
        "Enter a valid Indian mobile number.",
      );

      return;
    }

    if (
      !memberForm.name.trim() ||
      !memberForm.email.includes("@") ||
      memberForm.password.length < 6
    ) {
      toast.error(
        "Enter name, valid email and password of at least 6 characters.",
      );

      return;
    }

    if (
      memberForm.membershipPlan &&
      !memberForm.membershipStartDate
    ) {
      toast.error(
        "Select a membership start date.",
      );

      return;
    }

    const selectedPlan = plans.find(
      (plan) =>
        plan.name ===
        memberForm.membershipPlan,
    );

    const calculatedEnd = selectedPlan
      ? addPlanDuration(
          memberForm.membershipStartDate,
          selectedPlan.duration,
        )
      : "";

    /*
     * Open a blank tab immediately while this is
     * still a user click.
     *
     * This avoids browser popup blocking after
     * the asynchronous API request finishes.
     */
    const whatsappWindow =
      window.open("", "_blank");

    if (whatsappWindow) {
      whatsappWindow.document.title =
        "Opening WhatsApp...";
      whatsappWindow.document.body.innerHTML =
        "<p style='font-family:Arial;padding:30px'>Opening WhatsApp...</p>";
    }

    try {
      setSavingMember(true);

      const response = await fetch(
        "/api/admin/members",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            ...authHeaders(),
          },

          body: JSON.stringify({
            name: memberForm.name.trim(),
            email: memberForm.email.trim(),
            phone,
            password: memberForm.password,
            membershipPlan:
              memberForm.membershipPlan,
            membershipStartDate:
              memberForm.membershipStartDate ||
              undefined,
            membershipEndDate:
              calculatedEnd || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (whatsappWindow) {
          whatsappWindow.close();
        }

        throw new Error(
          data.message ||
            "Could not add member",
        );
      }

      setShowMemberForm(false);
      setMemberForm(emptyMember);

      /*
       * Open manually prepared WhatsApp
       * message.
       */
      if (data?.whatsappUrl) {
        if (whatsappWindow) {
          whatsappWindow.location.href =
            data.whatsappUrl;
        } else {
          window.location.href =
            data.whatsappUrl;
        }
      } else if (whatsappWindow) {
        whatsappWindow.close();

        toast.error(
          "Member was created, but WhatsApp URL was not returned by the server.",
        );
      }

      /*
       * Refresh dashboard independently.
       * Even if refresh fails, WhatsApp has
       * already been opened.
       */
      try {
        await Promise.all([
          loadDashboard(),
          loadMembers(),
        ]);
      } catch {
        // Do not fail member creation because
        // dashboard refresh failed.
      }

      toast.success(
        `${data?.user?.name || memberForm.name} added to members`,
        {
          description:
            data?.whatsappUrl
              ? "WhatsApp opened with the welcome message. Press Send manually."
              : "Member created successfully.",
        },
      );
    } catch (error) {
      if (whatsappWindow) {
        try {
          whatsappWindow.close();
        } catch {
          // Ignore close errors.
        }
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add member",
      );
    } finally {
      setSavingMember(false);
    }
  };

  const createFollowUp = async (
    member: Member,
  ) => {
    try {
      const response = await fetch(
        "/api/admin/follow-ups",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            ...authHeaders(),
          },

          body: JSON.stringify({
            memberId: member.id,
            reason: member.detail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not create follow-up",
        );
      }

      toast.success(
        `Follow-up created for ${member.name}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create follow-up",
      );
    }
  };

  const openMembershipExtension = (
    member: Member,
  ) => {
    const today = new Date();

    const currentEnd =
      member.membershipEndDate
        ? new Date(
            member.membershipEndDate,
          )
        : null;

    const defaultStart =
      currentEnd && currentEnd >= today
        ? new Date(
            currentEnd.getFullYear(),
            currentEnd.getMonth(),
            currentEnd.getDate() + 1,
          )
        : today;

    const firstPlan = plans[0];

    setExtensionPlanId(
      firstPlan?._id || "",
    );

    setExtensionStartDate(
      toDateInput(defaultStart),
    );

    setExtensionAmount(
      firstPlan
        ? String(firstPlan.price)
        : "",
    );

    setExtensionPaymentMethod(
      "cash",
    );

    setExtensionNote("");

    setShowMembershipExtension(true);
  };

  const selectedExtensionPlan =
    plans.find(
      (plan) =>
        plan._id ===
        extensionPlanId,
    );

  const calculatedExtensionEnd =
    selectedExtensionPlan
      ? addPlanDuration(
          extensionStartDate,
          selectedExtensionPlan.duration,
        )
      : "";

  const selectedNewMemberPlan =
    plans.find(
      (plan) =>
        plan.name ===
        memberForm.membershipPlan,
    );

  const calculatedNewMemberEnd =
    selectedNewMemberPlan
      ? addPlanDuration(
          memberForm.membershipStartDate,
          selectedNewMemberPlan.duration,
        )
      : "";

  const openAddMember = () => {
    setMemberForm({
      ...emptyMember,
      membershipStartDate:
        toDateInput(new Date()),
    });

    setShowMemberForm(true);
  };

  const handleExtendMembership =
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedMember) return;

      if (
        !extensionPlanId ||
        !extensionStartDate
      ) {
        toast.error(
          "Select a plan and start date.",
        );

        return;
      }

      try {
        setSavingExtension(true);

        const response = await fetch(
          `/api/admin/members/${selectedMember.id}/membership`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders(),
            },

            body: JSON.stringify({
              planId: extensionPlanId,
              startDate:
                extensionStartDate,
              paymentAmount:
                extensionAmount,
              paymentMethod:
                extensionPaymentMethod,
              note: extensionNote,
            }),
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Could not update membership",
          );
        }

        setShowMembershipExtension(
          false,
        );

        setSelectedMember({
          ...selectedMember,
          plan:
            data.member
              .membershipPlan ||
            "No plan",

          membershipStartDate:
            data.member
              .membershipStartDate ||
            null,

          membershipEndDate:
            data.member
              .membershipEndDate ||
            null,
        });

        await Promise.all([
          loadDashboard(),
          loadMembers(),
        ]);

        toast.success(
          "Payment recorded and membership updated",
          {
            description: `${
              data.calculated.duration
            } · ends ${new Date(
              data.calculated.endDate,
            ).toLocaleDateString(
              "en-IN",
            )}`,
          },
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update membership",
        );
      } finally {
        setSavingExtension(false);
      }
    };

  const handleChangeMemberPassword =
    async () => {
      if (!selectedMember) return;

      if (memberNewPassword.length < 6) {
        toast.error(
          "Password must be at least 6 characters.",
        );

        return;
      }

      if (
        memberNewPassword !==
        memberConfirmPassword
      ) {
        toast.error(
          "Passwords do not match.",
        );

        return;
      }

      try {
        setSavingMemberPassword(
          true,
        );

        const response = await fetch(
          `/api/admin/members/${selectedMember.id}/password`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders(),
            },

            body: JSON.stringify({
              password:
                memberNewPassword,
              confirmPassword:
                memberConfirmPassword,
            }),
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to change member password.",
          );
        }

        setMemberNewPassword("");
        setMemberConfirmPassword(
          "",
        );

        setShowMemberPasswordForm(
          false,
        );

        toast.success(
          "Member password changed successfully.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to change member password.",
        );
      } finally {
        setSavingMemberPassword(
          false,
        );
      }
    };

  const deleteMember = async (
    member: Member,
  ) => {
    const confirmed = window.confirm(
      `Delete ${member.name}'s member record permanently? This will also remove attendance, rewards, follow-ups and payment history.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/members/${member.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not delete member",
        );
      }

      setSelectedMember(null);
      setShowMembershipExtension(
        false,
      );

      await Promise.all([
        loadDashboard(),
        loadMembers(),
      ]);

      toast.success(
        `${member.name} deleted successfully`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete member",
      );
    }
  };

  const logout = () => {
    localStorage.removeItem(
      "pulseforge_token",
    );

    localStorage.removeItem(
      "pulseforge_user",
    );

    localStorage.removeItem(
      "pulseforge_role",
    );

    localStorage.removeItem(
      "isLoggedIn",
    );

    setLocation("/");
  };

  if (
    !currentUser ||
    currentUser.role !== "owner"
  ) {
    return null;
  }

  const maxChart = Math.max(
    1,
    ...(dashboard?.daily.map(
      (x) => x.count,
    ) || [1]),
  );

  const change = dashboard
    ? percentChange(
        dashboard.checkinsToday,
        dashboard.checkinsYesterday,
      )
    : 0;

  const filteredVisible = members;

  const initials = (
    currentUser.name || "Owner"
  )
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link
          href="/"
          className="admin-logo"
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>

          <span>
            pulse
            <span className="brand-accent">
              forge
            </span>
          </span>
        </Link>

        <div className="admin-workspace">
          <span className="mini-eyebrow">
            WORKSPACE
          </span>

          <button className="workspace-button">
            <span className="workspace-avatar">
              PF
            </span>

            <span>
              <b>PulseForge Gym</b>
              <small>
                Owner workspace
              </small>
            </span>

            <ChevronDown size={14} />
          </button>
        </div>

        <nav className="admin-nav">
          <span className="mini-eyebrow">
            OPERATIONS
          </span>

          <a
            className="active"
            href="#overview"
          >
            <Activity size={16} />
            Overview
          </a>

          <a href="#members">
            <UsersRound size={16} />
            Members
            <b>
              {dashboard?.totalMembers ??
                "—"}
            </b>
          </a>

          <a href="#attendance">
            <QrCodeIcon />
            Attendance
          </a>

          <a href="#follow-ups">
            <PhoneCall size={16} />
            Follow-ups
            <b className="nav-alert">
              {dashboard?.followUps
                .length ?? 0}
            </b>
          </a>

          <a href="#memberships">
            <CalendarDays size={16} />
            Memberships
          </a>

          <span className="mini-eyebrow nav-spacer">
            SYSTEM
          </span>

          <a href="#settings">
            <Settings size={16} />
            Settings
          </a>

          <a href="#privacy">
            <ShieldCheck size={16} />
            Privacy & access
          </a>
        </nav>

        <div className="admin-side-footer">
          <div>
            <span className="status-pip" />

            {loading
              ? "connecting to MongoDB"
              : "system operational"}
          </div>

          <button onClick={logout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="mini-eyebrow">
              {new Date()
                .toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )
                .toUpperCase()}
            </span>

            <h1>Gym overview</h1>
          </div>

          <div className="admin-top-actions">
            <button
              onClick={() =>
                downloadCsv(
                  filteredVisible,
                )
              }
            >
              <Download size={15} />
              Export
            </button>

            <button
              className="admin-profile"
              onClick={() =>
                toast.info(
                  "Owner account is connected to MongoDB.",
                )
              }
            >
              <span>{initials}</span>

              {currentUser.name ||
                "Owner"}

              <ChevronDown size={13} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          <section
            id="overview"
            className="admin-kpi-grid"
          >
            <div className="admin-kpi">
              <span>
                total members
              </span>

              <strong>
                {dashboard?.totalMembers ??
                  "—"}
              </strong>

              <small className="good">
                live{" "}
                <em>
                  from MongoDB
                </em>
              </small>
            </div>

            <div className="admin-kpi">
              <span>
                check-ins today
              </span>

              <strong>
                {dashboard?.checkinsToday ??
                  "—"}
              </strong>

              <small
                className={
                  change >= 0
                    ? "good"
                    : "warn"
                }
              >
                {change >= 0
                  ? "↑"
                  : "↓"}{" "}
                {Math.abs(change)}%
                <em>
                  {" "}
                  vs. yesterday
                </em>
              </small>
            </div>

            <div className="admin-kpi">
              <span>
                expiring in 7 days
              </span>

              <strong className="warn">
                {dashboard?.expiringMembers ??
                  "—"}
              </strong>

              <small>
                needs staff review
              </small>
            </div>

            <div className="admin-kpi">
              <span>
                active health
              </span>

              <strong>
                {dashboard?.activeHealth ??
                  "—"}
                %
              </strong>

              <small className="good">
                {dashboard?.activeMembers ??
                  0}{" "}
                active members
              </small>
            </div>
          </section>

          <section className="admin-dashboard-grid">
            <div
              className="admin-panel attendance-panel"
              id="attendance"
            >
              <div className="admin-panel-head">
                <div>
                  <span className="mini-eyebrow">
                    ATTENDANCE
                  </span>

                  <h2>
                    Daily check-ins
                  </h2>
                </div>

                <button
                  onClick={() =>
                    toast.info(
                      "Showing the last 30 days from MongoDB.",
                    )
                  }
                >
                  Last 30 days
                  <ChevronDown
                    size={13}
                  />
                </button>
              </div>

              <div className="admin-chart">
                <div className="chart-y">
                  <span>
                    {maxChart}
                  </span>

                  <span>
                    {Math.round(
                      maxChart *
                        0.75,
                    )}
                  </span>

                  <span>
                    {Math.round(
                      maxChart *
                        0.5,
                    )}
                  </span>

                  <span>
                    {Math.round(
                      maxChart *
                        0.25,
                    )}
                  </span>

                  <span>0</span>
                </div>

                <div className="chart-body">
                  <div className="admin-line" />

                  <div className="chart-bars-admin">
                    {(
                      dashboard?.daily ||
                      []
                    ).map(
                      (
                        item,
                        index,
                      ) => (
                        <i
                          key={
                            item.date +
                            index
                          }
                          title={`${item.label}: ${item.count}`}
                          style={{
                            height: `${Math.max(
                              3,
                              (item.count /
                                maxChart) *
                                100,
                            )}%`,
                          }}
                        />
                      ),
                    )}
                  </div>

                  <div className="chart-x">
                    <span>
                      {dashboard
                        ?.daily[0]
                        ?.label ||
                        "—"}
                    </span>

                    <span>
                      {dashboard
                        ?.daily[7]
                        ?.label ||
                        "—"}
                    </span>

                    <span>
                      {dashboard
                        ?.daily[14]
                        ?.label ||
                        "—"}
                    </span>

                    <span>
                      {dashboard
                        ?.daily[21]
                        ?.label ||
                        "—"}
                    </span>

                    <span>
                      {dashboard
                        ?.daily[29]
                        ?.label ||
                        "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-lime" />
                  check-ins
                </span>

                <span>
                  <i className="legend-gray" />
                  target
                </span>

                <b>
                  <Activity size={14} />
                  peak:{" "}
                  {Math.max(
                    0,
                    ...(dashboard?.daily.map(
                      (x) =>
                        x.count,
                    ) || [0]),
                  )}{" "}
                  today
                </b>
              </div>
            </div>

            <div className="admin-panel pulse-panel">
              <div className="admin-panel-head">
                <div>
                  <span className="mini-eyebrow">
                    MEMBERSHIP HEALTH
                  </span>

                  <h2>
                    Plan status
                  </h2>
                </div>

                <button
                  onClick={() =>
                    document
                      .getElementById(
                        "members",
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      })
                  }
                >
                  Details
                  <ArrowUpRightIcon />
                </button>
              </div>

              <div
                className="health-donut"
                style={
                  {
                    "--health": `${
                      dashboard?.activeHealth ??
                      0
                    }%`,
                  } as CSSProperties
                }
              >
                <div>
                  <strong>
                    {dashboard?.activeHealth ??
                      0}
                    <span>%</span>
                  </strong>

                  <small>
                    active health
                  </small>
                </div>
              </div>

              <div className="health-list">
                <div>
                  <i className="health-lime" />

                  <span>
                    Active
                  </span>

                  <b>
                    {dashboard?.activeMembers ??
                      0}{" "}
                    <small>
                      {dashboard?.activeHealth ??
                        0}
                      %
                    </small>
                  </b>
                </div>

                <div>
                  <i className="health-amber" />

                  <span>
                    Expiring soon
                  </span>

                  <b>
                    {dashboard?.expiringMembers ??
                      0}
                  </b>
                </div>

                <div>
                  <i className="health-coral" />

                  <span>
                    Expired
                  </span>

                  <b>
                    {dashboard?.expiredMembers ??
                      0}
                  </b>
                </div>
              </div>
            </div>
          </section>

          <section
            id="follow-ups"
            className="admin-panel follow-panel"
          >
            <div className="admin-panel-head">
              <div>
                <span className="mini-eyebrow">
                  STAFF ACTIONS
                </span>

                <h2>
                  Who to call today
                </h2>
              </div>

              <span className="live-admin">
                <i />
                live queue ·{" "}
                {dashboard?.followUps
                  .length ?? 0}
              </span>
            </div>

            <div className="follow-grid">
              <div className="follow-highlight">
                <span className="follow-number">
                  {dashboard?.followUps
                    .length ?? 0}
                </span>

                <b>
                  members need
                  attention
                </b>

                <p>
                  Members with
                  missed
                  check-ins or
                  plans expiring
                  within 7 days.
                </p>

                <button
                  onClick={() =>
                    document
                      .getElementById(
                        "members",
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      })
                  }
                >
                  Open follow-up
                  queue
                  <ArrowUpRightIcon />
                </button>
              </div>

              <div className="follow-items">
                {(
                  dashboard?.followUps ||
                  []
                )
                  .slice(0, 3)
                  .map(
                    (member) => (
                      <div
                        key={
                          member.id
                        }
                      >
                        <span
                          className={`admin-avatar avatar-${member.tone}`}
                        >
                          {
                            member.initials
                          }
                        </span>

                        <span>
                          <b>
                            {
                              member.name
                            }
                          </b>

                          <small>
                            {
                              member.detail
                            }
                          </small>
                        </span>

                        <button
                          onClick={() =>
                            createFollowUp(
                              member,
                            )
                          }
                        >
                          <PhoneCall
                            size={14}
                          />
                        </button>
                      </div>
                    ),
                  )}
              </div>
            </div>
          </section>

          <section
            id="members"
            className="admin-panel members-panel"
          >
            <div className="admin-panel-head">
              <div>
                <span className="mini-eyebrow">
                  MEMBER DIRECTORY
                </span>

                <h2>
                  Member records
                </h2>
              </div>

              <button
                className="add-member"
                onClick={
                  openAddMember
                }
              >
                <Plus size={15} />
                Add member
              </button>
            </div>

            {showMemberForm && (
              <form
                className="membership-plan-form"
                onSubmit={
                  handleAddMember
                }
              >
                <div className="membership-form-title">
                  <div>
                    <span className="mini-eyebrow">
                      NEW MEMBER
                    </span>

                    <h3>
                      Add a member
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="membership-form-close"
                    onClick={() =>
                      setShowMemberForm(
                        false,
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="membership-form-grid">
                  <label>
                    <span>
                      Name
                    </span>

                    <input
                      value={
                        memberForm.name
                      }
                      onChange={(e) =>
                        setMemberForm(
                          {
                            ...memberForm,
                            name: e
                              .target
                              .value,
                          },
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Email
                    </span>

                    <input
                      type="email"
                      value={
                        memberForm.email
                      }
                      onChange={(e) =>
                        setMemberForm(
                          {
                            ...memberForm,
                            email:
                              e.target
                                .value,
                          },
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Phone
                    </span>

                    <input
                      type="tel"
                      value={
                        memberForm.phone
                      }
                      onChange={(e) =>
                        setMemberForm(
                          {
                            ...memberForm,
                            phone:
                              e.target
                                .value,
                          },
                        )
                      }
                      placeholder="10-digit mobile number"
                      required
                    />

                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "7px",
                        opacity:
                          0.72,
                      }}
                    >
                      WhatsApp welcome
                      message will
                      open after
                      the member is
                      created.
                    </small>
                  </label>

                  <label>
                    <span>
                      Permanent
                      password
                    </span>

                    <input
                      type="password"
                      value={
                        memberForm.password
                      }
                      onChange={(e) =>
                        setMemberForm(
                          {
                            ...memberForm,
                            password:
                              e.target
                                .value,
                          },
                        )
                      }
                      minLength={6}
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Membership plan
                    </span>

                    <select
                      value={
                        memberForm.membershipPlan
                      }
                      onChange={(e) => {
                        const planName =
                          e.target
                            .value;

                        const plan =
                          plans.find(
                            (p) =>
                              p.name ===
                              planName,
                          );

                        setMemberForm(
                          {
                            ...memberForm,

                            membershipPlan:
                              planName,

                            membershipEndDate:
                              plan
                                ? addPlanDuration(
                                    memberForm.membershipStartDate,
                                    plan.duration,
                                  )
                                : "",
                          },
                        );
                      }}
                    >
                      <option value="">
                        No plan
                      </option>

                      {plans.map(
                        (plan) => (
                          <option
                            key={
                              plan._id
                            }
                            value={
                              plan.name
                            }
                          >
                            {plan.name} ·{" "}
                            {formatPrice(
                              plan.price,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span>
                      Membership
                      start date
                    </span>

                    <input
                      type="date"
                      value={
                        memberForm.membershipStartDate
                      }
                      onChange={(e) => {
                        const startDate =
                          e.target
                            .value;

                        setMemberForm(
                          {
                            ...memberForm,

                            membershipStartDate:
                              startDate,

                            membershipEndDate:
                              selectedNewMemberPlan
                                ? addPlanDuration(
                                    startDate,
                                    selectedNewMemberPlan.duration,
                                  )
                                : "",
                          },
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>
                      Calculated
                      end date
                    </span>

                    <input
                      type="date"
                      value={
                        calculatedNewMemberEnd
                      }
                      readOnly
                    />
                  </label>
                </div>

                <div className="membership-extension-preview">
                  <CalendarDays size={15} />

                  <span>
                    {selectedNewMemberPlan
                      ? `${selectedNewMemberPlan.name}: ${
                          memberForm.membershipStartDate ||
                          "—"
                        } → ${
                          calculatedNewMemberEnd ||
                          "—"
                        }`
                      : "Select a membership plan to calculate the end date automatically."}
                  </span>
                </div>

                <div className="membership-form-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMemberForm(
                        false,
                      )
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="membership-save-button"
                    disabled={
                      savingMember
                    }
                  >
                    <Save size={14} />

                    {savingMember
                      ? "Saving..."
                      : "Add member"}
                  </button>
                </div>
              </form>
            )}

            <div className="table-tools">
              <div className="search-box">
                <Search size={15} />

                <input
                  value={query}
                  onChange={(e) =>
                    setQuery(
                      e.target.value,
                    )
                  }
                  placeholder="Search members"
                  aria-label="Search members"
                />
              </div>

              <button
                onClick={() =>
                  setFilter(
                    filter ===
                      "All members"
                      ? "At risk"
                      : "All members",
                  )
                }
              >
                <Filter size={14} />

                {filter}
              </button>
            </div>

            <div className="admin-table">
              <div className="table-row table-head">
                <span>
                  member
                </span>

                <span>
                  plan
                </span>

                <span>
                  status
                </span>

                <span>
                  last activity
                </span>

                <span />
              </div>

              {filteredVisible.map(
                (row) => (
                  <div
                    className="table-row"
                    key={row.id}
                  >
                    <button
                      type="button"
                      className="table-member member-click-target"
                      onClick={() =>
                        setSelectedMember(
                          row,
                        )
                      }
                      aria-label={`View ${row.name} information`}
                    >
                      <i
                        className={`admin-avatar avatar-${row.tone}`}
                      >
                        {
                          row.initials
                        }
                      </i>

                      <span className="member-click-text">
                        <b>
                          {row.name}
                        </b>

                        <small>
                          {row.phone ||
                            row.email}
                        </small>
                      </span>
                    </button>

                    <span>
                      {row.plan}
                    </span>

                    <span>
                      <i
                        className={`risk-dot risk-${
                          row.tone ===
                          "coral"
                            ? "critical"
                            : row.tone ===
                                "amber"
                              ? "high"
                              : row.tone ===
                                  "violet"
                                ? "medium"
                                : "low"
                        }`}
                      />

                      {row.status}
                    </span>

                    <span>
                      {row.detail}
                    </span>

                    <span>
                      <button
                        className="row-action"
                        onClick={() =>
                          createFollowUp(
                            row,
                          )
                        }
                      >
                        <PhoneCall
                          size={14}
                        />

                        follow up
                      </button>
                    </span>
                  </div>
                ),
              )}

              {filteredVisible.length ===
                0 && (
                <div className="admin-empty">
                  No member records
                  match this
                  search.
                </div>
              )}
            </div>
          </section>

          {selectedMember && (
            <div
              className="member-details-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="member-details-title"
              onMouseDown={(
                event,
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setSelectedMember(
                    null,
                  );

                  setShowMembershipExtension(
                    false,
                  );
                }
              }}
            >
              <div className="member-details-modal">
                <div className="member-details-header">
                  <div className="member-details-identity">
                    <i
                      className={`admin-avatar avatar-${selectedMember.tone}`}
                    >
                      {
                        selectedMember.initials
                      }
                    </i>

                    <div>
                      <span className="mini-eyebrow">
                        MEMBER INFORMATION
                      </span>

                      <h2 id="member-details-title">
                        {
                          selectedMember.name
                        }
                      </h2>

                      <small>
                        {
                          selectedMember.email
                        }
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="member-details-close"
                    onClick={() => {
                      setSelectedMember(
                        null,
                      );

                      setShowMembershipExtension(
                        false,
                      );
                    }}
                    aria-label="Close member information"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="member-details-grid">
                  <div className="member-detail-card">
                    <span>
                      Name
                    </span>

                    <strong>
                      {selectedMember.name ||
                        "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Phone number
                    </span>

                    <strong>
                      {selectedMember.phone ||
                        "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedMember.email ||
                        "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Status
                    </span>

                    <strong>
                      {selectedMember.status ||
                        "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Membership plan
                    </span>

                    <strong>
                      {selectedMember.plan ||
                        "No plan"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Membership start
                    </span>

                    <strong>
                      {selectedMember.membershipStartDate
                        ? new Date(
                            selectedMember.membershipStartDate,
                          ).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Membership expiry
                    </span>

                    <strong>
                      {selectedMember.membershipEndDate
                        ? new Date(
                            selectedMember.membershipEndDate,
                          ).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Last activity
                    </span>

                    <strong>
                      {
                        selectedMember.detail ||
                        "No activity"
                      }
                    </strong>
                  </div>

                  <div className="member-detail-card">
                    <span>
                      Last check-in
                    </span>

                    <strong>
                      {selectedMember.lastCheckIn
                        ? new Date(
                            selectedMember.lastCheckIn,
                          ).toLocaleString(
                            "en-IN",
                          )
                        : "—"}
                    </strong>
                  </div>
                </div>

                {showMembershipExtension && (
                  <form
                    className="membership-extension-form"
                    onSubmit={
                      handleExtendMembership
                    }
                  >
                    <div className="membership-extension-title">
                      <div>
                        <span className="mini-eyebrow">
                          PAYMENT &
                          MEMBERSHIP
                        </span>

                        <h3>
                          Extend member
                          plan
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="membership-form-close"
                        onClick={() =>
                          setShowMembershipExtension(
                            false,
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="membership-extension-grid">
                      <label>
                        <span>
                          Select plan
                        </span>

                        <select
                          value={
                            extensionPlanId
                          }
                          onChange={(e) => {
                            const id =
                              e.target
                                .value;

                            const plan =
                              plans.find(
                                (p) =>
                                  p._id ===
                                  id,
                              );

                            setExtensionPlanId(
                              id,
                            );

                            setExtensionAmount(
                              plan
                                ? String(
                                    plan.price,
                                  )
                                : "",
                            );
                          }}
                        >
                          <option value="">
                            Choose plan
                          </option>

                          {plans.map(
                            (plan) => (
                              <option
                                key={
                                  plan._id
                                }
                                value={
                                  plan._id
                                }
                              >
                                {
                                  plan.name
                                }{" "}
                                ·{" "}
                                {formatPrice(
                                  plan.price,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          Membership
                          start date
                        </span>

                        <input
                          type="date"
                          value={
                            extensionStartDate
                          }
                          onChange={(e) =>
                            setExtensionStartDate(
                              e.target
                                .value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>
                          Calculated
                          end date
                        </span>

                        <input
                          type="date"
                          value={
                            calculatedExtensionEnd
                          }
                          readOnly
                        />
                      </label>

                      <label>
                        <span>
                          Amount received
                          (₹)
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={
                            extensionAmount
                          }
                          onChange={(e) =>
                            setExtensionAmount(
                              e.target
                                .value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>
                          Payment method
                        </span>

                        <select
                          value={
                            extensionPaymentMethod
                          }
                          onChange={(e) =>
                            setExtensionPaymentMethod(
                              e.target
                                .value,
                            )
                          }
                        >
                          <option value="cash">
                            Cash
                          </option>

                          <option value="upi">
                            UPI
                          </option>

                          <option value="card">
                            Card
                          </option>

                          <option value="bank_transfer">
                            Bank transfer
                          </option>

                          <option value="other">
                            Other
                          </option>
                        </select>
                      </label>

                      <label>
                        <span>
                          Note
                        </span>

                        <input
                          value={
                            extensionNote
                          }
                          onChange={(e) =>
                            setExtensionNote(
                              e.target
                                .value,
                            )
                          }
                          placeholder="Optional"
                        />
                      </label>
                    </div>

                    <div className="membership-extension-preview">
                      <CalendarDays
                        size={15}
                      />

                      <span>
                        {selectedExtensionPlan
                          ? `${selectedExtensionPlan.name}: ${
                              extensionStartDate ||
                              "—"
                            } → ${
                              calculatedExtensionEnd ||
                              "—"
                            }`
                          : "Choose a plan and start date. The membership end date will be calculated automatically."}
                      </span>
                    </div>

                    <div className="membership-extension-actions">
                      <button
                        type="button"
                        onClick={() =>
                          setShowMembershipExtension(
                            false,
                          )
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="membership-save-button"
                        disabled={
                          savingExtension
                        }
                      >
                        <CreditCard
                          size={14}
                        />

                        {savingExtension
                          ? "Saving..."
                          : "Mark paid & extend"}
                      </button>
                    </div>

                    <p className="membership-payment-note">
                      Customer pays the
                      gym owner directly.
                      This website only
                      records the payment
                      received by the
                      owner.
                    </p>
                  </form>
                )}

                {showMemberPasswordForm && (
                  <div className="member-password-form">
                    <div className="membership-extension-title">
                      <div>
                        <span className="mini-eyebrow">
                          OWNER ACCESS
                        </span>

                        <h3>
                          Change member
                          password
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="membership-form-close"
                        onClick={() => {
                          if (
                            savingMemberPassword
                          ) {
                            return;
                          }

                          setShowMemberPasswordForm(
                            false,
                          );

                          setMemberNewPassword(
                            "",
                          );

                          setMemberConfirmPassword(
                            "",
                          );
                        }}
                        aria-label="Close password form"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="member-password-grid">
                      <label>
                        <span>
                          New permanent
                          password
                        </span>

                        <input
                          type="password"
                          minLength={6}
                          autoComplete="new-password"
                          value={
                            memberNewPassword
                          }
                          onChange={(e) =>
                            setMemberNewPassword(
                              e.target
                                .value,
                            )
                          }
                          placeholder="Minimum 6 characters"
                        />
                      </label>

                      <label>
                        <span>
                          Confirm
                          password
                        </span>

                        <input
                          type="password"
                          minLength={6}
                          autoComplete="new-password"
                          value={
                            memberConfirmPassword
                          }
                          onChange={(e) =>
                            setMemberConfirmPassword(
                              e.target
                                .value,
                            )
                          }
                          placeholder="Enter password again"
                        />
                      </label>
                    </div>

                    <div className="membership-extension-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMemberPasswordForm(
                            false,
                          );

                          setMemberNewPassword(
                            "",
                          );

                          setMemberConfirmPassword(
                            "",
                          );
                        }}
                        disabled={
                          savingMemberPassword
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="membership-save-button"
                        onClick={
                          handleChangeMemberPassword
                        }
                        disabled={
                          savingMemberPassword
                        }
                      >
                        <Save size={14} />

                        {savingMemberPassword
                          ? "Saving..."
                          : "Save password"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="member-details-actions">
                  <button
                    type="button"
                    onClick={() =>
                      createFollowUp(
                        selectedMember,
                      )
                    }
                  >
                    <PhoneCall
                      size={15}
                    />
                    Create follow-up
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openMembershipExtension(
                        selectedMember,
                      )
                    }
                  >
                    <CalendarDays
                      size={15}
                    />
                    Extend plan
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openMembershipExtension(
                        selectedMember,
                      )
                    }
                  >
                    <CreditCard
                      size={15}
                    />
                    Record payment
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberPasswordForm(
                        (value) =>
                          !value,
                      );

                      setMemberNewPassword(
                        "",
                      );

                      setMemberConfirmPassword(
                        "",
                      );
                    }}
                  >
                    <ShieldCheck
                      size={15}
                    />
                    Change password
                  </button>

                  <button
                    type="button"
                    className="member-delete-button"
                    onClick={() =>
                      deleteMember(
                        selectedMember,
                      )
                    }
                  >
                    <Trash2
                      size={15}
                    />
                    Delete member
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(
                        null,
                      );

                      setShowMembershipExtension(
                        false,
                      );
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <section
            id="memberships"
            className="admin-panel membership-admin-panel"
          >
            <div className="admin-panel-head">
              <div>
                <span className="mini-eyebrow">
                  MEMBERSHIP MANAGEMENT
                </span>

                <h2>
                  Plans & pricing
                </h2>
              </div>

              <button
                className="add-member"
                onClick={
                  openAddPlan
                }
              >
                <Plus size={15} />
                New membership
              </button>
            </div>

            {showPlanForm && (
              <form
                className="membership-plan-form"
                onSubmit={
                  handleSavePlan
                }
              >
                <div className="membership-form-title">
                  <div>
                    <span className="mini-eyebrow">
                      {editingId
                        ? "EDIT MEMBERSHIP"
                        : "NEW MEMBERSHIP"}
                    </span>

                    <h3>
                      {editingId
                        ? "Update membership plan"
                        : "Create a membership plan"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="membership-form-close"
                    onClick={
                      closePlanForm
                    }
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="membership-form-grid">
                  <label>
                    <span>
                      Plan name
                    </span>

                    <input
                      value={
                        planForm.name
                      }
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          name: e
                            .target
                            .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Duration
                    </span>

                    <input
                      value={
                        planForm.duration
                      }
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          duration:
                            e.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Price (₹)
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        planForm.price
                      }
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          price: e
                            .target
                            .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Label
                    </span>

                    <input
                      value={
                        planForm.label
                      }
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          label: e
                            .target
                            .value,
                        })
                      }
                    />
                  </label>

                  <label className="membership-description-field">
                    <span>
                      Description
                    </span>

                    <textarea
                      rows={3}
                      value={
                        planForm.description
                      }
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          description:
                            e.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label className="membership-featured-field">
                    <span>
                      Featured plan
                    </span>

                    <button
                      type="button"
                      className={`membership-featured-toggle ${
                        planForm.featured
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setPlanForm({
                          ...planForm,
                          featured:
                            !planForm.featured,
                        })
                      }
                    >
                      <span>
                        {planForm.featured && (
                          <Check
                            size={13}
                          />
                        )}
                      </span>

                      {planForm.featured
                        ? "Featured on customer page"
                        : "Normal plan"}
                    </button>
                  </label>
                </div>

                <div className="membership-form-actions">
                  <button
                    type="button"
                    onClick={
                      closePlanForm
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="membership-save-button"
                    disabled={
                      savingPlan
                    }
                  >
                    <Save size={14} />

                    {savingPlan
                      ? "Saving..."
                      : editingId
                        ? "Save changes"
                        : "Add plan"}
                  </button>
                </div>
              </form>
            )}

            <div className="membership-admin-body">
              <div className="membership-admin-summary">
                <div>
                  <span>
                    available plans
                  </span>

                  <strong>
                    {plans.length}
                  </strong>
                </div>

                <div>
                  <span>
                    customer pricing
                  </span>

                  <strong>
                    INR ₹
                  </strong>
                </div>

                <button
                  onClick={
                    loadPlans
                  }
                  disabled={
                    loadingPlans
                  }
                >
                  {loadingPlans
                    ? "Refreshing..."
                    : "Refresh plans"}
                </button>
              </div>

              {loadingPlans ? (
                <div className="admin-empty">
                  Loading membership
                  plans...
                </div>
              ) : (
                <div className="membership-admin-list">
                  {plans.map(
                    (
                      plan,
                      index,
                    ) => (
                      <div
                        className="membership-admin-row"
                        key={
                          plan._id
                        }
                      >
                        <div className="membership-plan-number">
                          {String(
                            index +
                              1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </div>

                        <div className="membership-plan-info">
                          <div>
                            <b>
                              {
                                plan.name
                              }
                            </b>
                          </div>

                          <small>
                            {
                              plan.duration
                            }{" "}
                            ·{" "}
                            {
                              plan.label
                            }
                          </small>
                        </div>

                        <div className="membership-plan-price">
                          {formatPrice(
                            plan.price,
                          )}
                        </div>

                        <div className="membership-plan-actions">
                          <button
                            type="button"
                            onClick={() =>
                              openEditPlan(
                                plan,
                              )
                            }
                          >
                            <Pencil
                              size={14}
                            />
                          </button>

                          <button
                            type="button"
                            className="membership-delete-button"
                            onClick={() =>
                              handleDeletePlan(
                                plan,
                              )
                            }
                          >
                            <Trash2
                              size={14}
                            />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>

          <section
            id="privacy"
            className="admin-notice"
          >
            <ShieldCheck size={17} />

            <span>
              <b>
                Privacy note
              </b>{" "}
              Membership and attendance
              information is stored in
              your MongoDB database.
              Passwords are stored as
              hashes.
            </span>

            <a href="/privacy">
              View policy
              <ArrowUpRightIcon />
            </a>
          </section>
        </div>
      </section>
    </main>
  );
}

function QrCodeIcon() {
  return (
    <span style={{ fontSize: 16 }}>
      ▦
    </span>
  );
}

function ArrowUpRightIcon() {
  return <ArrowUpRight size={14} />;
}