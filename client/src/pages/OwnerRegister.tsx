import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface OwnerUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface RegisterResponse {
  message?: string;
  token?: string;
  user?: OwnerUser;
}

export default function OwnerRegister() {
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    ownerKey: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword ||
      !form.ownerKey.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const requestBody = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        ownerKey: form.ownerKey.trim(),
      };

      console.log(
        "Sending owner registration request:",
        {
          ...requestBody,
          password: "[hidden]",
          confirmPassword: "[hidden]",
          ownerKey: "[hidden]",
        },
      );

      const response = await fetch(
        "/api/auth/register-owner",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const contentType =
        response.headers.get("content-type") || "";

      const responseText = await response.text();

      console.log(
        "Owner registration response:",
        {
          status: response.status,
          statusText: response.statusText,
          contentType,
          responseText,
        },
      );

      let data: RegisterResponse = {};

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (error) {
          console.error(
            "Failed to parse server response:",
            error,
          );

          console.error(
            "Server returned:",
            responseText,
          );

          throw new Error(
            `Server returned an invalid response (${response.status}). Please check the backend response.`,
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Owner registration failed (${response.status}).`,
        );
      }

      if (!data.token) {
        throw new Error(
          data.message ||
            "Owner account was created, but no login token was returned.",
        );
      }

      if (!data.user) {
        throw new Error(
          "Owner account was created, but no user information was returned.",
        );
      }

      if (data.user.role !== "owner") {
        throw new Error(
          "The account was created, but it was not assigned the owner role.",
        );
      }

      /*
       * Save authentication information.
       */
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
        "owner",
      );

      localStorage.setItem(
        "pulseforge_auth",
        "true",
      );

      localStorage.setItem(
        "isLoggedIn",
        "true",
      );

      /*
       * Keep other possible application
       * authentication keys synchronized.
       */
      localStorage.setItem(
        "token",
        data.token,
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user),
      );

      toast.success(
        "Owner account created successfully!",
        {
          description: `Welcome, ${
            data.user.name || "Owner"
          }.`,
        },
      );

      /*
       * Clear the form.
       */
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        ownerKey: "",
      });

      /*
       * Go to Admin dashboard.
       */
      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
    } catch (error) {
      console.error(
        "Owner registration error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to create owner account.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[90vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">

          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black shadow-lg">
              <span className="text-xl font-black">
                PF
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Owner Registration
            </h1>

            <p className="mt-2 text-sm text-white/50">
              Create your PulseForge owner account
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Full Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
                required
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="owner@example.com"
                autoComplete="email"
                disabled={loading}
                required
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Phone Number

                <span className="ml-1 text-white/40">
                  (optional)
                </span>
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                autoComplete="tel"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                disabled={loading}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter password again"
                autoComplete="new-password"
                disabled={loading}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            {/* Owner Registration Key */}
            <div>
              <label
                htmlFor="ownerKey"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Owner Registration Key
              </label>

              <input
                id="ownerKey"
                name="ownerKey"
                type="password"
                value={form.ownerKey}
                onChange={handleChange}
                placeholder="Enter owner registration key"
                autoComplete="off"
                disabled={loading}
                required
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />

              <p className="mt-2 text-xs text-white/40">
                This key is required to create an
                owner account.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-5 py-3.5 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating Owner Account..."
                : "Create Owner Account"}
            </button>
          </form>

          {/* Back */}
          <button
            type="button"
            onClick={() => setLocation("/")}
            disabled={loading}
            className="mt-5 w-full py-2 text-sm text-white/50 transition hover:text-white disabled:opacity-50"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}