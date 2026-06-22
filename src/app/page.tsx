"use client";

import { FormEvent, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type { BillingCycle, Subscription, SubscriptionCategory, SubscriptionStatus } from "@/types/subscription";

type SubscriptionComputed = Subscription & {
  normalizedMonthlyCost: number;
  daysUntilRenewal: number;
  isRenewingSoon: boolean;
};

type MetricsResponse = {
  totalMonthlyBurn: number;
  upcomingRenewalsCount: number;
  burnByCategory: Record<SubscriptionCategory, number>;
  activeSubscriptionCount: number;
  totalSubscriptionCount: number;
};

const categoryClass: Record<SubscriptionCategory, string> = {
  STREAMING: "bg-[#EEEDFE] text-[#3C3489]",
  SAAS: "bg-[#E1F5EE] text-[#085041]",
  PRODUCTIVITY: "bg-[#FAEEDA] text-[#633806]",
  OTHER: "bg-[#F1EFE8] text-[#5F5E5A]",
};

const prettyCategory: Record<SubscriptionCategory, string> = {
  STREAMING: "Streaming",
  SAAS: "SaaS",
  PRODUCTIVITY: "Productivity",
  OTHER: "Other",
};

function DashboardApp() {
  const { data: session, status } = useSession();
  const [subscriptions, setSubscriptions] = useState<SubscriptionComputed[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [category, setCategory] = useState<SubscriptionCategory>("STREAMING");
  const [renewalDate, setRenewalDate] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [subsRes, metricsRes] = await Promise.all([
        fetch("/api/subscriptions", { cache: "no-store" }),
        fetch("/api/metrics", { cache: "no-store" }),
      ]);

      if (subsRes.ok) {
        const subsData = (await subsRes.json()) as SubscriptionComputed[];
        setSubscriptions(subsData);
      }

      if (metricsRes.ok) {
        const metricsData = (await metricsRes.json()) as MetricsResponse;
        setMetrics(metricsData);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }

  if (status === "authenticated" && !initialized && !loading) {
    queueMicrotask(() => {
      void loadData();
    });
  }

  async function onAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        if (authPassword !== authConfirmPassword) {
          setAuthError("Passwords do not match.");
          return;
        }

        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            name: authName,
          }),
        });

        const signupData = (await signupRes.json()) as { error?: string };
        if (!signupRes.ok) {
          setAuthError(signupData.error ?? "Signup failed.");
          return;
        }
      }

      const loginResult = await signIn("credentials", {
        email: authEmail,
        password: authPassword,
        redirect: false,
      });

      if (loginResult?.error) {
        setAuthError("Invalid email or password.");
        return;
      }

      setAuthEmail("");
      setAuthPassword("");
      setAuthConfirmPassword("");
      setAuthName("");
    } finally {
      setAuthLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      name,
      cost: Number(cost),
      billingCycle,
      category,
      renewalDate,
      status: "ACTIVE" as SubscriptionStatus,
    };

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setName("");
      setCost("");
      setBillingCycle("MONTHLY");
      setCategory("STREAMING");
      setRenewalDate("");
      await loadData();
    }
  }

  async function toggleStatus(id: string, current: SubscriptionStatus) {
    const next = current === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      await loadData();
    }
  }

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Streaming", value: metrics.burnByCategory.STREAMING, color: "#AFA9EC" },
      { label: "SaaS", value: metrics.burnByCategory.SAAS, color: "#5DCAA5" },
      { label: "Productivity", value: metrics.burnByCategory.PRODUCTIVITY, color: "#EF9F27" },
      { label: "Other", value: metrics.burnByCategory.OTHER, color: "#BEBBB0" },
    ];
  }, [metrics]);

  if (status === "loading") {
    return <div className="min-h-screen grid place-items-center text-[#5F5E5A]">Loading session...</div>;
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-[#F8F7FC] text-[#26215C] grid place-items-center p-6">
        <div className="w-full max-w-md bg-white border border-[#E0DEF4] rounded-2xl p-7 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Welcome to VibeFinance</h1>
          <p className="text-sm text-[#5F5E5A] mb-6">
            {authMode === "login"
              ? "Login with your email and password."
              : "Create your account with email and password."}
          </p>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                authMode === "login"
                  ? "bg-[#534AB7] text-white"
                  : "bg-[#EEEDFE] text-[#3C3489]"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                authMode === "signup"
                  ? "bg-[#534AB7] text-white"
                  : "bg-[#EEEDFE] text-[#3C3489]"
              }`}
            >
              Signup
            </button>
          </div>

          <form onSubmit={onAuthSubmit} className="space-y-3">
            {authMode === "signup" && (
              <input
                className="w-full border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                type="text"
                placeholder="Name (optional)"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            )}
            <input
              className="w-full border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />
            <input
              className="w-full border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
            {authMode === "signup" && (
              <input
                className="w-full border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                type="password"
                placeholder="Confirm password"
                value={authConfirmPassword}
                onChange={(e) => setAuthConfirmPassword(e.target.value)}
                required
              />
            )}
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-[#534AB7] hover:bg-[#3C3489] text-white py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Login"
                  : "Create account"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FC] text-[#26215C] p-4 md:p-6">
      <div className="mx-auto max-w-7xl rounded-2xl overflow-hidden border border-[#E0DEF4] bg-white min-h-[85vh] flex">
        <aside className="w-[74px] hover:w-[220px] transition-all duration-200 border-r border-[#E0DEF4] px-2 py-4 group hidden md:flex flex-col">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#534AB7] text-white grid place-items-center font-bold">$</div>
            <span className="opacity-0 group-hover:opacity-100 transition text-sm font-medium whitespace-nowrap">VibeFinance</span>
          </div>
          {["Dashboard", "Subscriptions", "Cash flow", "Renewals"].map((item, idx) => (
            <div
              key={item}
              className={`rounded-lg px-3 py-2 mb-2 text-sm ${
                idx === 0 ? "bg-[#EEEDFE] text-[#3C3489]" : "text-[#5F5E5A]"
              }`}
            >
              <span className="opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{item}</span>
            </div>
          ))}
          <div className="mt-auto px-2">
            <button
              onClick={() => signOut()}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#5F5E5A] hover:bg-[#F8F7FC]"
            >
              <span className="opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Sign out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <header className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <div className="text-xs px-3 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489]">
              {session.user?.email}
            </div>
          </header>

          <section className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-[#E0DEF4] p-4 bg-white">
              <div className="text-xs text-[#5F5E5A] mb-1">Total Monthly Burn Rate</div>
              <div className="text-2xl font-semibold">₹{metrics?.totalMonthlyBurn?.toFixed(2) ?? "0.00"}</div>
            </div>
            <div className="rounded-xl border border-[#E0DEF4] p-4 bg-white">
              <div className="text-xs text-[#5F5E5A] mb-1">Upcoming Renewals (7 days)</div>
              <div className="text-2xl font-semibold">{metrics?.upcomingRenewalsCount ?? 0}</div>
            </div>
          </section>

          <section className="rounded-xl border border-[#E0DEF4] bg-white mb-4">
            <div className="px-4 py-3 border-b border-[#E0DEF4] text-sm font-medium">Add subscription</div>
            <form onSubmit={onSubmit} className="p-4 grid md:grid-cols-2 gap-3">
              <input
                className="border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                placeholder="Service name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                type="number"
                step="0.01"
                placeholder="Cost"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
              <select
                className="border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <select
                className="border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
              >
                <option value="STREAMING">Streaming</option>
                <option value="SAAS">SaaS</option>
                <option value="PRODUCTIVITY">Productivity</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                className="border border-[#D3D1C7] rounded-lg px-3 py-2 text-sm"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                required
              />
              <button className="rounded-lg bg-[#534AB7] hover:bg-[#3C3489] text-white py-2 text-sm font-medium">
                Save subscription
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-[#E0DEF4] bg-white mb-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E0DEF4] text-sm font-medium">Active subscriptions</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF9] text-[#5F5E5A]">
                  <tr>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Cost</th>
                    <th className="text-left p-3">Renews</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr
                      key={s.id}
                      className={`${s.status === "PAUSED" ? "opacity-50 bg-gray-50" : ""} ${
                        s.isRenewingSoon ? "bg-[#FEFBF5]" : ""
                      } border-t border-[#F1EFE8]`}
                    >
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${categoryClass[s.category]}`}>
                          {prettyCategory[s.category]}
                        </span>
                      </td>
                      <td className="p-3">
                        ₹{s.cost} / {s.billingCycle === "MONTHLY" ? "mo" : "yr"}
                      </td>
                      <td className="p-3">
                        {new Date(s.renewalDate).toLocaleDateString()}
                        {s.isRenewingSoon && (
                          <span className="ml-2 text-xs bg-[#FAEEDA] text-[#633806] px-2 py-0.5 rounded-full">
                            Renewing Soon
                          </span>
                        )}
                      </td>
                      <td className="p-3">{s.status}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleStatus(s.id, s.status)}
                          className={`px-3 py-1 rounded-full text-xs ${
                            s.status === "ACTIVE" ? "bg-[#EEEDFE] text-[#3C3489]" : "bg-[#F1EFE8] text-[#5F5E5A]"
                          }`}
                        >
                          {s.status === "ACTIVE" ? "Pause" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && subscriptions.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-[#5F5E5A]" colSpan={6}>
                        No subscriptions yet. Add your first one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[#E0DEF4] bg-white p-4">
            <div className="text-sm font-medium mb-3">Monthly cash flow burn (by category)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {chartData.map((item) => (
                <div key={item.label} className="rounded-lg border border-[#F1EFE8] p-3">
                  <div className="text-xs text-[#5F5E5A] mb-2">{item.label}</div>
                  <div
                    className="h-16 rounded-md"
                    style={{
                      background: `linear-gradient(to top, ${item.color} ${
                        (Math.min(item.value, 5000) / 5000) * 100
                      }%, #f3f3f3 0)`,
                    }}
                  />
                  <div className="mt-2 text-sm font-medium">₹{item.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return <DashboardApp />;
}
