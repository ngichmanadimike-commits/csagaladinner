import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
      if (!displayName.trim()) {
        toast.error("Username is required");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName.trim() } },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Sign in to access the site. Admin access requires approval from an existing admin.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
        setDisplayName("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        // Check if user is admin
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", currentUser.id)
            .eq("role", "admin")
            .maybeSingle();
          if (role) {
            navigate("/admin");
          } else {
            toast.info("You're signed in. Admin access requires approval from an existing admin.");
            navigate("/");
          }
        }
      }
    }
  };

  const handleGoogle = async () => {
    try {
      // Try Lovable Cloud auth first (works on lovable.app domains)
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        throw result.error;
      }
      if (result.redirected) return;
      navigate("/admin");
    } catch {
      // Fallback to native Supabase OAuth (works on Vercel/other deployments)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast.error("Google sign-in failed: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass rounded-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">CSA Gala Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Username</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Your display name"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {isSignUp && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {!forgotMode && (
          <button
            onClick={() => setForgotMode(true)}
            className="block mx-auto text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        )}

        {forgotMode && !resetSent && (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Enter your email to receive a reset link</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Send Reset Link
            </button>
            <button type="button" onClick={() => setForgotMode(false)} className="block mx-auto text-xs text-muted-foreground hover:text-primary">
              ← Back to login
            </button>
          </form>
        )}

        {resetSent && (
          <p className="text-center text-sm text-emerald-400">Reset link sent! Check your inbox.</p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>Already have an account?{" "}
              <button onClick={() => { setIsSignUp(false); setForgotMode(false); setResetSent(false); }} className="text-primary hover:underline font-semibold">Sign In</button>
            </>
          ) : (
            <>Don't have an account?{" "}
              <button onClick={() => { setIsSignUp(true); setForgotMode(false); setResetSent(false); setConfirmPassword(""); setDisplayName(""); }} className="text-primary hover:underline font-semibold">Sign Up</button>
            </>
          )}
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <a href="/" className="text-primary hover:underline">← Back to site</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
