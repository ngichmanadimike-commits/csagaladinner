import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import csaLogo from "@/assets/white_logo.jpg";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
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
          toast.error("Access denied — you don't have admin privileges.");
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0A1628 0%, #0A2342 100%)" }}>
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(212,175,55,0.3)" }}>
        <div className="text-center mb-8">
          <img src={csaLogo} alt="CSA"
            className="h-16 w-16 rounded-full object-cover mx-auto mb-4 border-2 border-yellow-500/30" />
          <h1 className="font-bold text-2xl text-white">Admin Portal</h1>
          <p className="text-white/40 text-sm mt-1">CSA Gala Dinner 2026</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="admin@example.com"
              className="w-full px-4 py-3 rounded-xl border text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }} />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Password</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-4 py-3 pr-12 rounded-xl border text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-xs text-white/30 mt-6">Restricted to authorized administrators only</p>
        <div className="text-center mt-3">
          <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back to event site</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
