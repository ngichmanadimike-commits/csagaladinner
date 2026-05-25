import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield, Clock, UserPlus, LogIn } from "lucide-react";
import csaLogo from "@/assets/white_logo.jpg";

type Mode = "login" | "signup" | "pending";

const AdminLogin = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        const roles = (roleData || []).map((r: any) => r.role);
        const hasAdmin = roles.includes("admin") || roles.includes("super_admin");
        if (hasAdmin) {
          toast.success("Welcome back!");
          navigate("/admin", { replace: true });
        } else {
          // Signed up but not yet approved
          await supabase.auth.signOut();
          setPendingEmail(email);
          setMode("pending");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!displayName.trim()) { toast.error("Full name is required"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: displayName.trim() } },
      });
      if (error) throw error;

      if (data.user) {
        // Upsert profile so admin can see them in pending list
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          email: email.trim().toLowerCase(),
          display_name: displayName.trim(),
        });
        // Sign them out immediately — they must wait for approval
        await supabase.auth.signOut();
      }

      setPendingEmail(email);
      setMode("pending");
    } catch (err: any) {
      toast.error(err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" };
  const labelClass = "text-xs text-white/60 mb-1 block";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Pending Approval Screen ─────────────────────────────────────────────
  if (mode === "pending") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #0A1628 0%, #0A2342 100%)" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center space-y-6"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(212,175,55,0.3)" }}
        >
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
            <Clock size={36} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-white mb-2">Awaiting Approval</h1>
            <p className="text-white/50 text-sm">
              Your account <span className="text-white font-semibold">{pendingEmail}</span> has been created.
            </p>
          </div>
          <div
            className="rounded-xl p-4 text-left space-y-2"
            style={{ backgroundColor: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} className="text-yellow-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-white">What happens next?</p>
            </div>
            <ul className="text-xs text-white/50 space-y-1.5 pl-5 list-disc">
              <li>An existing admin will review your sign-up request</li>
              <li>Once approved you'll be granted admin access</li>
              <li>Return here to sign in with your credentials</li>
              <li>Contact the CSA team if you need urgent access</li>
            </ul>
          </div>
          <button
            onClick={() => { setMode("login"); setPassword(""); setConfirmPassword(""); setDisplayName(""); }}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
          >
            Back to Sign In
          </button>
          <a href="/" className="block text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to event site
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0A1628 0%, #0A2342 100%)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(212,175,55,0.3)" }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src={csaLogo}
            alt="CSA"
            className="h-16 w-16 rounded-full object-cover mx-auto mb-4 border-2 border-yellow-500/30"
          />
          <h1 className="font-bold text-2xl text-white">Admin Portal</h1>
          <p className="text-white/40 text-sm mt-1">CSA Gala Dinner 2026</p>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 mb-6"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPassword(""); setConfirmPassword(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === m
                  ? { backgroundColor: "#D4AF37", color: "#0A2342" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {m === "login" ? <LogIn size={14} /> : <UserPlus size={14} />}
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="admin@example.com"
                className={inputClass} style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className={`${inputClass} pr-12`} style={inputStyle}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* SIGN UP */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
            >
              <p className="text-xs text-yellow-300 flex items-start gap-2">
                <Shield size={13} className="flex-shrink-0 mt-0.5" />
                After signing up, an admin will review and approve your account before you can access the dashboard.
              </p>
            </div>
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                required placeholder="Your full name"
                className={inputClass} style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className={inputClass} style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className={`${inputClass} pr-12`} style={inputStyle}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input
                type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                className={inputClass} style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating account..." : "Request Access"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-white/30 mt-6">Restricted to authorized administrators only</p>
        <div className="text-center mt-3">
          <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back to event site</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
