import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) { toast.error(error?.message ?? "Invalid credentials"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const ok = (roles ?? []).some((r: any) => ["admin","super_admin"].includes(String(r.role)));
      if (!ok) { toast.error("Not an admin account"); await supabase.auth.signOut(); return; }
      toast.success("Welcome!");
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8">
        <h1 className="text-3xl font-serif text-center mb-2">CSA Admin Login</h1>
        <p className="text-muted-foreground text-center mb-8">Sign in to access the admin dashboard</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
          <button type="button" onClick={() => navigate("/")} className="w-full text-sm text-muted-foreground">
            ← Back to site
          </button>
        </form>
      </div>
    </div>
  );
}
