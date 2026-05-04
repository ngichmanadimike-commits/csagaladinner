import { supabase } from "@/integrations/supabase/client";

export interface LogParams {
  actionType: string;
  description?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  status?: "success" | "failed";
}

/**
 * Append an admin activity log entry. Fire-and-forget — never blocks the
 * caller, never throws. RLS allows any authenticated user to insert their
 * own entry; only super admins can read.
 */
export async function logAdminAction(params: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, branch")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roleList = (roles || []).map((r: any) => r.role);
    const role = roleList.includes("super_admin") ? "super_admin" : roleList.includes("admin") ? "admin" : "user";

    await supabase.from("admin_activity_logs").insert({
      admin_id: user.id,
      admin_name: profile?.display_name || user.email,
      admin_email: profile?.email || user.email,
      role,
      branch: (profile as any)?.branch || "general",
      action_type: params.actionType,
      action_description: params.description,
      target_type: params.targetType,
      target_id: params.targetId,
      metadata: params.metadata || {},
      device_info: typeof navigator !== "undefined" ? navigator.userAgent : null,
      status: params.status || "success",
    });
  } catch (e) {
    // Never block — log to console only
    console.warn("[adminLog] failed:", e);
  }
}
