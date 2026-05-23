import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Search, CheckCircle, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Registration {
  id: string;
  full_name: string;
  name: string;
  email: string;
  phone: string;
  package_type: string;
  ticket_type: string;
  amount: number;
  total_cost: number;
  total_paid: number;
  payment_status: string;
  mpesa_receipt_number: string;
  ticket_code: string;
  quantity: number;
  created_at: string;
}

const statusColor: Record<string, string> = {
  paid: "#22c55e",
  pending: "#D4AF37",
  failed: "#ef4444",
  refunded: "#8b5cf6",
};

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
     .from("registrations")
     .select("*")
     .order("created_at", { ascending: false });
    setRegistrations((data as Registration[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markAsPaid = async (id: string) => {
    setUpdating(id);
    const { error } = await supabase
     .from("registrations")
     .update({ payment_status: "paid", ticket_issued: true })
     .eq("id", id);
    if (error) {
      toast.error("Update failed: " + error.message);
    }
    else {
      toast.success("Marked as paid");
      await load();
    }
    setUpdating(null);
  };

  const filtered = registrations.filter((r) => {
    const name = (r.name || r.full_name || "").toLowerCase();
    const email = (r.email || "").toLowerCase();
    const code = (r.ticket_code || "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch =!search || name.includes(q) || email.includes(q) || code.includes(q);
    const matchFilter = filter === "all" || r.payment_status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Registrations</h1>
            <p className="text-white/50 text-sm">{registrations.length} total registrations</p>
          </div>
          <button
            onClick={() => {
              const csv = [
                ["Name", "Email", "Phone", "Package", "Amount", "Status", "Code", "Date"].join(","),
               ...filtered.map((r) =>
                  [r.name || r.full_name, r.email, r.phone, r.package_type || r.ticket_type, r.total_cost || r.amount, r.payment_status, r.ticket_code, new Date(r.created_at).toLocaleDateString()].join(",")
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "registrations.csv";
              a.click();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or ticket code..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-white text-sm focus:outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "paid", "pending", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  backgroundColor: filter === f? "#D4AF37" : "rgba(255,255,255,0.05)",
                  color: filter === f? "#0A2342" : "rgba(255,255,255,0.5)"
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  {["Name", "Contact", "Package", "Amount", "M-Pesa Code", "Status", "Ticket Code", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-white/30">
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  filtered.map((reg) => (
                    <tr key={reg.id} className="border-t transition-colors hover:bg-white/2" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {reg.name || reg.full_name}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        <p>{reg.email}</p>
                        <p>{reg.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-white/70 text-xs max-w-[120px]">
                        {reg.package_type || reg.ticket_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        KES {Number(reg.total_cost || reg.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs font-mono">
                        {reg.mpesa_receipt_number || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            color: statusColor[reg.payment_status] || "#fff",
                            backgroundColor: `${statusColor[reg.payment_status] || "#666"}20`
                          }}>
                          {reg.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reg.ticket_code? (
                          <a
                            href={`/ticket/${reg.ticket_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-mono text-yellow-400 hover:text-yellow-300">
                            {reg.ticket_code} <ExternalLink size={10} />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(reg.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {reg.payment_status!== "paid" && (
                          <button
                            onClick={() => markAsPaid(reg.id)}
                            disabled={updating === reg.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
                            style={{
                              backgroundColor: "rgba(34,197,94,0.15)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.3)"
                            }}>
                            <CheckCircle size={12} />
                            {updating === reg.id? "..." : "Mark Paid"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRegistrations;
