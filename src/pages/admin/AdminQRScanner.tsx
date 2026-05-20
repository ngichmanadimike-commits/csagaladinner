import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  QrCode, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Search, List, Clock, User, Ticket, Ban
} from "lucide-react";

interface ScanRecord {
  id: string;
  ticket_code: string;
  scanned_at: string;
  scanned_by: string | null;
  registrations: {
    name: string;
    email: string;
    phone: string;
    package_type: string;
    quantity: number;
    payment_status: string;
  } | null;
}

type ScanResult =
  | { status: "success"; name: string; package_type: string; quantity: number; alreadyScanned: false }
  | { status: "already_used"; name: string; scanned_at: string; scanned_by: string | null; alreadyScanned: true }
  | { status: "not_found" }
  | { status: "unpaid"; name: string; payment_status: string }
  | { status: "error"; message: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

const AdminQRScanner = () => {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [searchScans, setSearchScans] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!(window as any).jsQR) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
      document.head.appendChild(s);
    }
  }, []);

  const fetchScans = useCallback(async () => {
    setLoadingScans(true);
    const { data } = await supabase
      .from("ticket_scans")
      .select(`id, ticket_code, scanned_at, scanned_by,
        registrations ( name, email, phone, package_type, quantity, payment_status )`)
      .order("scanned_at", { ascending: false })
      .limit(200);
    setScans((data as ScanRecord[]) || []);
    setLoadingScans(false);
  }, []);

  useEffect(() => {
    fetchScans();
    const channel = supabase
      .channel("ticket_scans_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_scans" }, fetchScans)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchScans]);

  const processCode = useCallback(async (raw: string) => {
    if (scanning) return;
    let code = raw.trim();
    try {
      const url = new URL(code);
      const param = url.searchParams.get("code");
      if (param) code = param;
      const pathMatch = url.pathname.match(/\/ticket\/([A-Z0-9-]+)/i);
      if (pathMatch) code = pathMatch[1];
    } catch { /* not a URL */ }

    code = code.toUpperCase();
    if (!code) return;

    setScanning(true);
    setResult(null);

    try {
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select("id, name, package_type, quantity, payment_status, ticket_code")
        .eq("ticket_code", code)
        .maybeSingle();

      if (regErr) { setResult({ status: "error", message: regErr.message }); return; }
      if (!reg) { setResult({ status: "not_found" }); return; }

      if (reg.payment_status !== "paid" && reg.payment_status !== "verified") {
        setResult({ status: "unpaid", name: reg.name, payment_status: reg.payment_status });
        return;
      }

      const { data: existingScan } = await supabase
        .from("ticket_scans")
        .select("scanned_at, scanned_by")
        .eq("ticket_code", code)
        .maybeSingle();

      if (existingScan) {
        setResult({
          status: "already_used",
          name: reg.name,
          scanned_at: existingScan.scanned_at,
          scanned_by: existingScan.scanned_by,
          alreadyScanned: true,
        });
        return;
      }

      const { error: insertErr } = await supabase.from("ticket_scans").insert({
        registration_id: reg.id,
        ticket_code: code,
        scanned_by: user?.email ?? null,
        device_info: navigator.userAgent,
      });

      if (insertErr) { setResult({ status: "error", message: insertErr.message }); return; }

      setResult({
        status: "success",
        name: reg.name,
        package_type: reg.package_type,
        quantity: reg.quantity,
        alreadyScanned: false,
      });
      toast.success(`✅ Admitted: ${reg.name}`);
      fetchScans();
    } finally {
      setScanning(false);
    }
  }, [scanning, user, fetchScans]);

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const jsQR = (window as any).jsQR;
    if (!video || !canvas || !jsQR || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code && code.data && code.data !== lastScannedCode.current) {
      lastScannedCode.current = code.data;
      processCode(code.data);
      setTimeout(() => { lastScannedCode.current = null; }, 3000);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      tick();
    } catch (e: any) {
      setCameraError(e?.message ?? "Camera access denied");
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    lastScannedCode.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) { processCode(manualCode.trim()); setManualCode(""); }
  };

  const ResultCard = () => {
    if (!result) return null;
    if (result.status === "success")
      return (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-5 flex items-start gap-4">
          <CheckCircle2 size={32} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-300 text-lg">ADMITTED ✓</p>
            <p className="text-foreground font-semibold">{result.name}</p>
            <p className="text-muted-foreground text-sm">{result.package_type} × {result.quantity}</p>
          </div>
        </div>
      );
    if (result.status === "already_used")
      return (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/40 p-5 flex items-start gap-4">
          <Ban size={32} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-300 text-lg">TICKET ALREADY USED</p>
            <p className="text-foreground font-semibold">{result.name}</p>
            <p className="text-muted-foreground text-sm">
              First scanned {fmt(result.scanned_at)}{result.scanned_by ? ` by ${result.scanned_by}` : ""}
            </p>
          </div>
        </div>
      );
    if (result.status === "not_found")
      return (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex items-start gap-4">
          <XCircle size={32} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-300 text-lg">TICKET NOT FOUND</p>
            <p className="text-muted-foreground text-sm">This code doesn't match any registration.</p>
          </div>
        </div>
      );
    if (result.status === "unpaid")
      return (
        <div className="rounded-xl bg-orange-500/10 border border-orange-500/40 p-5 flex items-start gap-4">
          <AlertTriangle size={32} className="text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-300 text-lg">PAYMENT NOT VERIFIED</p>
            <p className="text-foreground font-semibold">{result.name}</p>
            <p className="text-muted-foreground text-sm">Status: {result.payment_status}</p>
          </div>
        </div>
      );
    if (result.status === "error")
      return (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex items-start gap-4">
          <XCircle size={32} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-300 text-lg">ERROR</p>
            <p className="text-muted-foreground text-sm">{result.message}</p>
          </div>
        </div>
      );
    return null;
  };

  const filteredScans = scans.filter((s) => {
    const q = searchScans.toLowerCase();
    if (!q) return true;
    return (
      (s.registrations?.name?.toLowerCase() ?? "").includes(q) ||
      (s.registrations?.email?.toLowerCase() ?? "").includes(q) ||
      (s.ticket_code?.toLowerCase() ?? "").includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <QrCode size={26} className="text-primary" /> QR Ticket Scanner
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Scan tickets at the door — each ticket can only be used once.
            </p>
          </div>
          <div className="glass rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-primary">{scans.length}</p>
            <p className="text-xs text-muted-foreground">Admitted</p>
          </div>
        </div>

        {/* Camera */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <QrCode size={18} /> Camera Scanner
            </h2>
            {!cameraActive ? (
              <button onClick={startCamera} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors">
                Stop Camera
              </button>
            )}
          </div>

          {cameraError && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-2">
              {cameraError} — use the manual entry below.
            </div>
          )}

          <div className={`relative rounded-xl overflow-hidden bg-black ${cameraActive ? "block" : "hidden"}`} style={{ aspectRatio: "16/9" }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-2 border-primary rounded-xl opacity-70 relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
              </div>
            </div>
            {scanning && (
              <div className="absolute top-3 right-3 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded-full animate-pulse">
                Checking…
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Manual entry */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Search size={18} /> Manual Code Entry
          </h2>
          <form onSubmit={handleManual} className="flex gap-2">
            <input
              ref={inputRef}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. CSA-66FA3C"
              className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={scanning || !manualCode.trim()}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {scanning ? "Checking…" : "Check In"}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <ResultCard />
            <button
              onClick={() => { setResult(null); inputRef.current?.focus(); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear result
            </button>
          </div>
        )}

        {/* Scanned list */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <List size={18} /> Scanned Tickets
              <span className="text-xs text-muted-foreground font-normal">({scans.length} total)</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchScans}
                  onChange={(e) => setSearchScans(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 w-40"
                />
              </div>
              <button onClick={fetchScans} title="Refresh" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <RefreshCw size={15} className={loadingScans ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {loadingScans ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {scans.length === 0 ? "No tickets scanned yet." : "No results match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                    <th className="p-3"><User size={13} className="inline mr-1" />Name</th>
                    <th className="p-3"><Ticket size={13} className="inline mr-1" />Code</th>
                    <th className="p-3">Package</th>
                    <th className="p-3 hidden sm:table-cell">Email</th>
                    <th className="p-3"><Clock size={13} className="inline mr-1" />Scanned At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium text-foreground">{s.registrations?.name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-primary font-semibold">{s.ticket_code}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {s.registrations?.package_type ?? "—"}
                        {s.registrations?.quantity && s.registrations.quantity > 1 ? ` ×${s.registrations.quantity}` : ""}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs hidden sm:table-cell">{s.registrations?.email ?? "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{fmt(s.scanned_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminQRScanner;
