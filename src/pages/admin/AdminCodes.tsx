import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, Search, Download, Ticket } from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";

const AdminCodes = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: summary }, { data: pays }] = await Promise.all([
      supabase.from("code_payment_summary").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("id, registration_id, amount, mpesa_code, source, verified, verified_at, created_at").order("created_at", { ascending: false }),
    ]);
    setRows(summary || []);
    const grouped: Record<string, any[]> = {};
    (pays || []).forEach((p: any) => {
      grouped[p.registration_id] ||= [];
      grouped[p.registration_id].push(p);
    });
    setPayments(grouped);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.ticket_code?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = {
    count: filtered.length,
    paid: filtered.reduce((s, r) => s + Number(r.total_paid || 0), 0),
    cost: filtered.reduce((s, r) => s + Number(r.total_cost || 0), 0),
    balance: filtered.reduce((s, r) => s + Number(r.balance || 0), 0),
  };

  const exportRows = () => {
    const flat: any[] = [];
    filtered.forEach((r) => {
      const ps = payments[r.registration_id] || [];
      if (ps.length === 0) {
        flat.push({
          "Booking Code": r.ticket_code, Name: r.name, Email: r.email, Phone: r.phone,
          Package: r.package_type, "Total Cost": r.total_cost, "Total Paid": r.total_paid,
          Balance: r.balance, Status: r.payment_status, "Ticket Issued": r.ticket_issued ? "Yes" : "No",
          "Secure Ticket Token": r.secure_ticket_token, "Payment Date": "", "Payment Time": "", "Payment Amount": "", "M-Pesa": "", "Verified": "",
        });
      } else {
        ps.forEach((p) => {
          const dt = p.verified_at || p.created_at;
          flat.push({
            "Booking Code": r.ticket_code, Name: r.name, Email: r.email, Phone: r.phone,
            Package: r.package_type, "Total Cost": r.total_cost, "Total Paid": r.total_paid,
            Balance: r.balance, Status: r.payment_status, "Ticket Issued": r.ticket_issued ? "Yes" : "No",
            "Secure Ticket Token": r.secure_ticket_token,
            "Payment Date": new Date(dt).toISOString().slice(0, 10),
            "Payment Time": new Date(dt).toISOString().slice(11, 19),
            "Payment Amount": Number(p.amount), "M-Pesa": p.mpesa_code, "Verified": p.verified ? "Yes" : "No",
          });
        });
      }
    });
    exportToXlsx(flat, "codes-cumulative-payments", "Codes");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><Ticket size={22} /> Booking Codes & Cumulative Payments</h1>
          <p className="text-xs text-muted-foreground">Each booking code's verified payments are cumulated. Click a row to expand the payment history.</p>
        </div>
        <button onClick={exportRows} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          <Download size={16} /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Codes</p><p className="text-xl font-bold">{totals.count}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total cost (KES)</p><p className="text-xl font-bold">{totals.cost.toLocaleString()}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total paid (KES)</p><p className="text-xl font-bold text-emerald-400">{totals.paid.toLocaleString()}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Balance (KES)</p><p className="text-xl font-bold text-orange-400">{totals.balance.toLocaleString()}</p></div>
      </div>

      <div className="glass rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, email, phone..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Fully paid</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <details key={r.registration_id} className="glass rounded-xl">
              <summary className="cursor-pointer p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-bold text-primary">{r.ticket_code || "—"}</p>
                  <p className="text-sm">{r.name} • <span className="text-muted-foreground">{r.email}</span></p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span>Cost: <strong>KES {Number(r.total_cost).toLocaleString()}</strong></span>
                  <span className="text-emerald-400">Paid: <strong>KES {Number(r.total_paid).toLocaleString()}</strong></span>
                  <span className="text-orange-400">Balance: <strong>KES {Number(r.balance).toLocaleString()}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full ${r.payment_status === "paid" ? "bg-emerald-400/10 text-emerald-400" : r.payment_status === "partial" ? "bg-yellow-400/10 text-yellow-400" : "bg-orange-400/10 text-orange-400"}`}>{r.payment_status}</span>
                  {r.ticket_issued && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">Ticket issued</span>}
                </div>
              </summary>
              <div className="px-4 pb-4">
                <div className="text-xs text-muted-foreground mb-2">Secure ticket token (admin view): <span className="font-mono">{r.secure_ticket_token}</span></div>
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground"><tr>
                    <th className="text-left py-1">Date</th><th className="text-left py-1">Time</th><th className="text-left py-1">Amount</th><th className="text-left py-1">M-Pesa</th><th className="text-left py-1">Source</th><th className="text-left py-1">Status</th>
                  </tr></thead>
                  <tbody>
                    {(payments[r.registration_id] || []).map((p) => {
                      const dt = p.verified_at || p.created_at;
                      return (
                        <tr key={p.id} className="border-t border-border/50">
                          <td className="py-1">{new Date(dt).toLocaleDateString()}</td>
                          <td className="py-1">{new Date(dt).toLocaleTimeString()}</td>
                          <td className="py-1 font-semibold">KES {Number(p.amount).toLocaleString()}</td>
                          <td className="py-1 font-mono">{p.mpesa_code || "—"}</td>
                          <td className="py-1">{p.source}</td>
                          <td className="py-1">{p.verified ? <span className="text-emerald-400">verified</span> : <span className="text-yellow-400">pending</span>}</td>
                        </tr>
                      );
                    })}
                    {(payments[r.registration_id] || []).length === 0 && (
                      <tr><td colSpan={6} className="py-2 text-center text-muted-foreground italic">No payments yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
          {filtered.length === 0 && <div className="glass rounded-xl p-8 text-center text-muted-foreground">No codes match.</div>}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCodes;
