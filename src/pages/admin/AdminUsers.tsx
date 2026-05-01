import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Shield, UserPlus, Trash2 } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
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
    const { data } = await supabase.from("user_roles").select("*");
    if (!data) { setLoading(false); return; }

    // Get profile emails for each role
    const enriched = await Promise.all(
      data.map(async (r) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", r.user_id)
          .maybeSingle();
        return { ...r, email: profile?.email || "Unknown" };
      })
    );
    setRoles(enriched);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setAllUsers((data as Profile[]) || []);
  };

  useEffect(() => { fetchRoles(); fetchAllUsers(); }, []);

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    // Find user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newEmail.trim())
      .maybeSingle();

    if (!profile) {
      toast.error("No user found with that email. They must sign up first.");
      setAdding(false);
      return;
    }

    // Check if already admin
    const existing = roles.find((r) => r.user_id === profile.user_id && r.role === "admin");
    if (existing) {
      toast.error("User is already an admin.");
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "admin" as any });

    setAdding(false);
    if (error) {
      toast.error("Failed to add admin: " + error.message);
    } else {
      toast.success(`${newEmail} is now an admin`);
      setNewEmail("");
      fetchRoles();
      fetchAllUsers();
    }
  };

  const handlePromoteUser = async (userId: string, email: string) => {
    const existing = roles.find((r) => r.user_id === userId && r.role === "admin");
    if (existing) {
      toast.error("User is already an admin.");
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" as any });
    if (error) {
      toast.error("Failed to promote user: " + error.message);
    } else {
      toast.success(`${email} is now an admin`);
      fetchRoles();
      fetchAllUsers();
    }
  };

  const handleRemoveRole = async (roleId: string, roleUserId: string) => {
    if (roleUserId === user?.id) {
      toast.error("You cannot remove your own admin role.");
      return;
    }

    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast.error("Failed to remove role");
    } else {
      toast.success("Role removed");
      fetchRoles();
      fetchAllUsers();
    }
  };

  const adminUserIds = roles.map((r) => r.user_id);

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">User Management</h1>

      {/* Admin Capabilities Panel */}
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

      {/* Add New Admin */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Add New Admin</h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="User email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleAddAdmin}
            disabled={adding || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Add
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">The user must have signed up first.</p>
      </div>

      {/* Existing Admins */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Current Admins</h2>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin roles found.</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: <span className="text-primary font-semibold capitalize">{r.role}</span>
                    {r.user_id === user?.id && <span className="ml-2 text-xs text-primary">(You)</span>}
                  </p>
                </div>
                {r.user_id !== user?.id && (
                  <button
                    onClick={() => handleRemoveRole(r.id, r.user_id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove admin"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Registered Users */}
      <div className="glass rounded-xl p-5 mt-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">All Registered Users</h2>
        <p className="text-xs text-muted-foreground mb-3">Users who have signed up. Promote them to admin to grant access.</p>
        {allUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No registered users yet.</p>
        ) : (
          <div className="space-y-2">
            {allUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.email || "No email"}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.display_name || "—"} · Joined {new Date(u.created_at).toLocaleDateString()}
                    {adminUserIds.includes(u.user_id) && <span className="ml-2 text-primary font-semibold">Admin</span>}
                  </p>
                </div>
                {!adminUserIds.includes(u.user_id) && (
                  <button
                    onClick={() => handlePromoteUser(u.user_id, u.email || "")}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    Make Admin
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
