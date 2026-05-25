import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2, Shield, UserPlus, Trash2, Clock, CheckCircle2,
  RefreshCw, User, Crown,
} from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  display_name?: string;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { user, isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, user_id, email, display_name, created_at").order("created_at", { ascending: false }),
    ]);

    if (rolesRes.error) {
      toast.error("Failed to load roles: " + rolesRes.error.message);
      setLoading(false);
      return;
    }

    const profileMap: Record<string, Profile> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const enriched: UserRole[] = (rolesRes.data || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
      email: profileMap[r.user_id]?.email || "Unknown",
      display_name: profileMap[r.user_id]?.display_name || "",
    }));

    setRoles(enriched);
    setAllProfiles((profilesRes.data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const adminUserIds = new Set(roles.map((r) => r.user_id));

  // Users who signed up (have a profile) but haven't been approved (no role yet)
  const pendingUsers = allProfiles.filter((p) => !adminUserIds.has(p.user_id));

  const handleApprove = async (profile: Profile) => {
    setApproving(profile.user_id);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "admin" as any });
    setApproving(null);
    if (error) {
      toast.error("Failed to approve: " + error.message);
    } else {
      toast.success(`${profile.email || profile.display_name} approved as admin`);
      fetchData();
    }
  };

  const handleAddByEmail = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newEmail.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      toast.error("No user found with that email. They must sign up first.");
      setAdding(false);
      return;
    }

    if (adminUserIds.has(profile.user_id)) {
      toast.error("That user is already an admin.");
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "admin" as any });

    setAdding(false);
    if (error) toast.error("Failed to add admin: " + error.message);
    else { toast.success(`${newEmail} is now an admin`); setNewEmail(""); fetchData(); }
  };

  const handlePromoteToSuperAdmin = async (r: UserRole) => {
    if (!isSuperAdmin) { toast.error("Only super admins can promote."); return; }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: r.user_id, role: "super_admin" as any });
    if (error) toast.error(error.message);
    else { toast.success(`${r.email} promoted to super_admin`); fetchData(); }
  };

  const handleRemoveRole = async (roleId: string, roleUserId: string) => {
    if (roleUserId === user?.id) { toast.error("You cannot remove your own admin role."); return; }
    if (!confirm("Remove this admin role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error("Failed to remove role: " + error.message);
    else { toast.success("Role removed"); fetchData(); }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Users & Roles</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Pending Approval ─────────────────────────────────────────── */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-yellow-400" />
          <h2 className="font-display text-lg font-bold text-foreground">Pending Approval</h2>
          {pendingUsers.length > 0 && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
              {pendingUsers.length} waiting
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Users who signed up for admin access and are waiting for your approval.
        </p>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <CheckCircle2 size={16} className="text-emerald-400" />
            No pending sign-up requests.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ backgroundColor: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{p.email || "No email"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.display_name && <span>{p.display_name} · </span>}
                    Signed up {formatDate(p.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(p)}
                  disabled={approving === p.user_id}
                  className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex-shrink-0"
                >
                  {approving === p.user_id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <CheckCircle2 size={13} />}
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Admin by Email ───────────────────────────────────────── */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Add Admin by Email</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="Registered user email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddByEmail()}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleAddByEmail}
            disabled={adding || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Add as Admin
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The user must have already signed up at /admin/login. You cannot remove your own admin role.
        </p>
      </div>

      {/* ── Current Admins ──────────────────────────────────────────── */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Current Admins</h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {roles.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin roles found.</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg px-4 py-3 bg-muted/50"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: r.role === "super_admin"
                      ? "rgba(212,175,55,0.15)"
                      : "rgba(99,102,241,0.15)",
                  }}
                >
                  {r.role === "super_admin"
                    ? <Crown size={14} className="text-yellow-400" />
                    : <User size={14} className="text-indigo-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{r.email}</p>
                    {r.user_id === user?.id && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.display_name && <span>{r.display_name} · </span>}
                    <span
                      className={`font-semibold capitalize ${r.role === "super_admin" ? "text-yellow-400" : "text-primary"}`}
                    >
                      {r.role.replace("_", " ")}
                    </span>
                    {" · "}Added {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isSuperAdmin && r.role === "admin" && r.user_id !== user?.id && (
                    <button
                      onClick={() => handlePromoteToSuperAdmin(r)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                      title="Promote to super admin"
                    >
                      <Crown size={15} />
                    </button>
                  )}
                  {r.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveRole(r.id, r.user_id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove admin role"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Capabilities reference ───────────────────────────────────── */}
      <div className="glass rounded-xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Admin Capabilities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "Manage Registrations", desc: "View, search, and manage all event registrations" },
            { title: "Verify Payments", desc: "View and verify M-Pesa and other payments" },
            { title: "Edit Website Content", desc: "Update text, images, and sections on the public site" },
            { title: "Upload Images & Docs", desc: "Upload and manage images and documents" },
            { title: "Configure Events", desc: "Create and publish events with dates, venues, and links" },
            { title: "Manage Admins", desc: "Approve sign-up requests and remove admin access" },
          ].map((cap) => (
            <div key={cap.title} className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{cap.title}</p>
              <p className="text-xs text-muted-foreground">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
