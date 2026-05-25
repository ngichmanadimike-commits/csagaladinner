import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, Clock } from "lucide-react";
import csaLogo from "@/assets/white_logo.jpg";

type Mode = "login" | "signup" | "forgot" | "pending";

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setResetSent(true); toast.success("Check your email for the reset link"); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName.trim() } },
    });
    setLoading(false);

    if (error) { toast.error(error.message); return; }

    // Create profile record
    if (data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        email: email.toLowerCase().trim(),
        display_name: displayName.trim(),
      });
    }

    setPendingEmail(email);
    setMode("pending");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast.error(error.message); return; }

    const userId = data.user?.id;
    let isAdmin = false;
    if (userId) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!role;
    }
    setLoading(false);

    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else {
      // Signed in but not admin — show pending page
      await supabase.auth.signOut();
      setPendingEmail(email);
      setMode("pending");
    }
  };

  // ── Pending approval screen ─────────────────────────────────────────────
  if (mode === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl max-w-md w-full p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
              <Clock size={36} className="text-primary" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Awaiting Approval</h1>
            <p className="text-muted-foreground text-sm">
              Your account <span className="text-foreground font-semibold">{pendingEmail}</span> has been created successfully.
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-foreground">What happens next?</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
              <li>An existing admin will review your account</li>
              <li>Once approved, you'll be granted admin access</li>
              <li>You can then sign in to access the dashboard</li>
              <li>Contact the CSA team if you need urgent access</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { setMode("login"); setPassword(""); setConfirmPassword(""); setDisplayName(""); }}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform"
            >
              Back to Sign In
            </button>
            <a href="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Return to site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass rounded-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src={csaLogo} alt="CSA Logo" className="h-14 w-14 rounded-full object-cover border-2 border-primary/30" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Admin Sign In"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">CSA Gala Dashboard</p>
        </div>

        {/* LOGIN FORM */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              Sign In
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setMode("forgot")}
                className="text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </button>
              <button type="button" onClick={() => { setMode("signup"); setPassword(""); }}
                className="text-primary hover:underline font-semibold">
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-300 flex items-start gap-2">
                <Shield size={14} className="flex-shrink-0 mt-0.5" />
                After signing up, your account will need admin approval before you can access the dashboard.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Display Name</label>
              <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
              <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              Create Account
            </button>
            <button type="button" onClick={() => setMode("login")}
              className="block mx-auto text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && !resetSent && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Enter your email to receive a reset link</p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 size={18} className="animate-spin" />}
              Send Reset Link
            </button>
            <button type="button" onClick={() => setMode("login")}
              className="block mx-auto text-xs text-muted-foreground hover:text-primary">
              ← Back to Sign In
            </button>
          </form>
        )}

        {mode === "forgot" && resetSent && (
          <div className="text-center space-y-4">
            <p className="text-emerald-400 font-semibold">Reset link sent! Check your inbox.</p>
            <button onClick={() => { setMode("login"); setResetSent(false); }}
              className="text-sm text-muted-foreground hover:text-primary">← Back to Sign In</button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="text-primary hover:underline">← Back to site</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
