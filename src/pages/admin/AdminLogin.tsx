import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Mail, Lock, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in as admin, skip the form
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roleList = (roles ?? []).map((r: any) => String(r.role));
      const isAdmin =
        roleList.includes("admin") || roleList.includes("super_admin");
      if (isAdmin) navigate("/admin/dashboard", { replace: true });
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // Step 1: Sign in
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError || !signInData.user) {
        toast.error(signInError?.message ?? "Invalid email or password");
        return;
      }

      // Step 2: Check role — treat query errors as "not admin" but still log them
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signInData.user.id);

      if (rolesError) {
        console.error("user_roles query error:", rolesError);
        // Don't block — still check what we got
      }

      const roleList = (roles ?? []).map((r: any) => String(r.role));
      const isAdmin =
        roleList.includes("admin") || roleList.includes("super_admin");

      if (!isAdmin) {
        toast.error(
          rolesError
            ? "Could not verify admin role — please try again"
            : "Access denied — this account is not an admin"
        );
        await supabase.auth.signOut();
        return;
      }

      toast.success("Signed in successfully");
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8">
        <h1 className="text-3xl font-serif text-center mb-2">CSA Admin Login</h1>
        <p className="text-muted-foreground text-center mb-8">
          Sign in to access the admin dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Signing in…" : "Sign In"}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to site
          </button>
        </form>
      </div>
    </div>
  );
}
