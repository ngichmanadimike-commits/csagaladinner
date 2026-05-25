import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Shield, UserPlus, Trash2, Clock, CheckCircle2 } from "lucide-react";

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
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  const fetchRoles = async () => {
    setLoading(true);
    // Fetch roles and profiles separately to avoid join schema cache issues
    const { data: rolesData, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load roles: " + error.message);
      setLoading(false);
      return;
    }

    // Fetch profiles to enrich with email
    const { data: profilesData } = await supabase.from("profiles").select("user_id, email, display_name");
    const profileMap: Record<string, Profile> = {};
    (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const enriched: UserRole[] = (rolesData || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
      email: profileMap[r.user_id]?.email || "Unknown",
      display_name: profileMap[r.user_id]?.display_name || "",
    }));

    setRoles(enriched);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setAllUsers((data as Profile[]) || []);
  };

  useEffect(() => { fetchRoles(); fetchAllUsers(); }, []);

  const handleAddAdmin = async () => {
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

    const existing = roles.find((r) => r.user_id === profile.user_id && r.role === "admin");
    if (existing) { toast.error("User is already an admin."); setAdding(false); return; }

    const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "admin" as any });
    setAdding(false);
    if (error) toast.error("Failed to add admin: " + error.message);
    else { toast.success(`${newEmail} is now an admin`); setNewEmail(""); fetchRoles(); fetchAllUsers(); }
  };

  const handlePromoteUser = async (userId: string, email: string) => {
    const existing = roles.find((r) => r.user_id === userId && r.role === "admin");
    if (existing) { toast.error("User is already an admin."); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    if (error) toast.error("Failed to promote user: " + error.message);
    else { toast.success(`${email} is now an admin`); fetchRoles(); fetchAllUsers(); }
  };

  const handleRemoveRole = async (roleId: string, roleUserId: string) => {
    if (roleUserId === user?.id) { toast.error("You cannot remove your own admin role."); return; }
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error("Failed to remove role");
    else { toast.success("Role removed"); fetchRoles(); fetchAllUsers(); }
  };

  const adminUserIds = roles.map((r) => r.user_id);
  const pendingUsers = allUsers.filter((u) => !adminUserIds.includes(u.user_id));
  const adminUsers = allUsers.filter((u) => adminUserIds.includes(u.user_id));

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">User Management</h1>

      {/* Admin Capabilities */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={20} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Admin Capabilities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "Manage Registrations", desc: "View, search, and manage all event registrations" },
            { title: "Verify Payments", desc: "View and verify M-Pesa and other payments" },
            { title: "Edit Website Content", desc: "Update text, images, and sections on the public site" },
            { title: "Upload Images", desc: "Upload and manage images for the website" },
            { title: "Configure Events", desc: "Create, edit, and publish events with dates, venues, and links" },
            { title: "Manage Admins", desc: "Add or remove other admin users" },
          ].map((cap) => (
            <div key={cap.title} className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{cap.title}</p>
              <p className="text-xs text-muted-foreground">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Users — awaiting approval */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-yellow-400" />
          <h2 className="font-display text-lg font-bold text-foreground">Pending Approval</h2>
          {pendingUsers.length > 0 && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
              {pendingUsers.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Users who have signed up but not yet been granted admin access.
        </p>
        {pendingUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users awaiting approval.</p>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.email || "No email"}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.display_name || "—"} · Signed up {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handlePromoteUser(u.user_id, u.email || "")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:scale-[1.02] transition-transform"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Admin by email */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Add Admin by Email</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="email" placeholder="User email address" value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={handleAddAdmin} disabled={adding || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50">
            {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Add as Admin
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The user must have already signed up. You cannot remove your own admin role.
        </p>
      </div>

      {/* Current Admins */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Current Admins</h2>
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin roles found.</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.display_name && <span>{r.display_name} · </span>}
                    Role: <span className="text-primary font-semibold capitalize">{r.role}</span>
                    {r.user_id === user?.id && <span className="ml-2 text-xs text-primary">(You)</span>}
                  </p>
                </div>
                {r.user_id !== user?.id && (
                  <button onClick={() => handleRemoveRole(r.id, r.user_id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove admin">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
