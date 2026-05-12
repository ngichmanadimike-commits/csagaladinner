import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  amount: number;
  mpesa_code: string;
  message: string;
  anonymous: boolean;
  created_at: string;
}

const AdminDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const fetchDonations = async () => {
    const { data } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });
    setDonations((data as Donation[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDonations();
    const channel = supabase
      .channel("donations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, fetchDonations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(d => d.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} donation(s)? Cannot be undone.`)) return;
    
    setDeletingSelected(true);
    const { error } = await supabase.from("donations").delete().in("id", selectedIds);
    setDeletingSelected(false);
    
    if (error) {
      toast.error("Delete failed: " + error.message);
      logAdminAction({ actionType: "DELETE_DONATION", description: `Failed to delete ${selectedIds.length} donations`, targetType: "donation", status: "failed", metadata: { error: error.message } });
    } else {
      toast.success(`${selectedIds.length} donation(s) deleted`);
      logAdminAction({ actionType: "DELETE_DONATION", description: `Deleted ${selectedIds.length} donation(s)`, targetType: "donation", metadata: { count: selectedIds.length } });
      setDonations(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (donation: Donation) => {
    if (!confirm(`Delete donation of KES ${donation.amount} from ${donation.donor_name}? Cannot be undone.`)) return;
    
    setDeletingId(donation
