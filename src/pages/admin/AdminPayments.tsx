import AdminLayout from "../../components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Search } from "lucide-react";
import { toast } from "sonner";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*, registrations(full_name, name, email, package_type, ticket_code)")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load payments");
      console.error(error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { 
    load(); 
  }, []);

  const verify = async (id: string, regId: string) => {
    setVerifying(id);
    
    const { error: paymentErr } = await supabase
      .from("payments")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", id);
    
    const { error: regErr } = await supabase
      .from("registrations")
      .update({ payment_status: "paid" })
      .eq("id", regId);

    if (paymentErr || regErr) {
      toast.error("Verification failed");
      console.error(paymentErr || regErr);
    } else {
      toast.success("Payment verified");
      await load();
    }
    setVerifying(null);
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const name = ((p.registrations?.name || p.registrations?.full_name) || "").toLowerCase();
    return !search || name.includes(q) || (p.mpesa_code || "").toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by name or M-Pesa code..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-white text-sm focus:outline-none"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} 
          />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  {["Registrant", "Package", "Amount", "M-Pesa Code", "Method", "Verified", "Date", "Action"].map(h =>
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/30">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/30">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="border-t hover:bg-white/2" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-3 text-white">
                        {p.registrations?.name || p.registrations?.full_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {p.registrations?.package_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-white">
                        KES {Number(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">
                        {p.mpesa_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {p.payment_method}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: p.verified ? "#22c55e" : "#D4AF37" }}>
                          {p.verified ? "✓ Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {!p.verified && (
                          <button 
                            onClick={() => verify(p.id, p.registration_id)}
                            disabled={verifying === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                            <CheckCircle size={12} /> 
                            {verifying === p.id ? "Verifying..." : "Verify"}
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

export default AdminPayments;
