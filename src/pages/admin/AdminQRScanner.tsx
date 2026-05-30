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

/**
 * Extracts the canonical ticket code from whatever the QR contains.
 * Handles:
 *  1. JSON payload  {"t":"CSA-XX","b":"CSA-XX","q":"token"}  → uses t (ticket_number)
 *  2. URL           https://…/ticket/CSA-XX?code=CSA-XX      → extracts path / param
 *  3. Plain string  CSA-AS5WDKHP4                            → returned as-is
 */
function extractCode(raw: string): string {
  const trimmed = raw.trim();

  // 1. Try JSON
  try {
    const parsed = JSON.parse(trimmed);
    const candidate = parsed.t || parsed.b || parsed.q || "";
    if (candidate) return String(candidate).toUpperCase();
  } catch { /* not JSON */ }

  // 2. Try URL
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get("code");
    if (param) return param.toUpperCase();
    const pathMatch = url.pathname.match(/\/ticket\/([A-Z0-9-]+)/i);
    if (pathMatch) return pathMatch[1].toUpperCase();
  } catch { /* not a URL */ }

  // 3. Plain code
  return trimmed.toUpperCase();
}

const AdminQRScanner = () => {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);
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
  const [jsQRLoaded, setJsQRLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).jsQR) { setJsQRLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    s.onload = () => setJsQRLoaded(true);
    s.onerror = () => setCameraError("Failed to load QR library. Please check your connection and refresh.");
    document.head.appendChild(s);
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
    if (scanningRef.current) return;

    // ── Parse QR payload (JSON, URL, or plain code) ──
    const code = extractCode(raw);
    if (!code) return;

    scanningRef.current = true;
    setScanning(true);
    setResult(null);

    try {
      // 1. Look up by ticket_code
      let { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select("id, name, package_type, quantity, payment_status, ticket_code")
        .eq("ticket_code", code)
        .maybeSingle();

      if (regErr) { setResult({ status: "error", message: regErr.message }); return; }

      // 2. If not found by ticket_code, try secure_ticket_token
      if (!reg) {
        // Also try to extract the "q" field from JSON for token lookup
        let tokenCandidate = code;
        try {
          const parsed = JSON.parse(raw.trim());
          if (parsed.q) tokenCandidate = String(parsed.q).toUpperCase();
        } catch { /* not JSON */ }

        const { data: regByToken, error: tokenErr } = await supabase
          .from("registrations")
          .select("id, name, package_type, quantity, payment_status, ticket_code")
          .eq("secure_ticket_token", tokenCandidate)
          .maybeSingle();
        if (tokenErr) { setResult({ status: "error", message: tokenErr.message }); return; }
        reg = regByToken;
        if (reg) {
          // normalise to the real ticket_code for scan record
          (reg as any)._useCode = reg.ticket_code ?? code;
        }
      }

      if (!reg) { setResult({ status: "not_found" }); return; }

      const scanCode = (reg as any)._useCode ?? code;

      // 3. Payment check
      if (reg.payment_status !== "paid" && reg.payment_status !== "partial" && reg.payment_status !== "confirmed") {
        setResult({ status: "unpaid", name: reg.name, payment_status: reg.payment_status });
        return;
      }

      // 4. Already scanned?
      const { data: existingScan } = await supabase
        .from("ticket_scans")
        .select("scanned_at, scanned_by")
        .eq("ticket_code", scanCode)
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

      // 5. Record scan
      const { error: insertErr } = await supabase.from("ticket_scans").insert({
        registration_id: reg.id,
        ticket_code: scanCode,
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
    } catch (err: any) {
      setResult({ status: "error", message: err.message });
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [user, fetchScans]);

  const tick = useCallback(() => {
    if (!streamRef.current || scanningRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const jsQRFn = (window as any).jsQR;
    if (!video || !canvas || !jsQRFn || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRFn(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (code && code.data && code.data !== lastScannedCode.current) {
      lastScannedCode.current = code.data;
      processCode(code.data);
      setTimeout(() => { lastScannedCode.current = null; }, 3000);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [processCode]);

  const startCamera = async () => {
    if (!jsQRLoaded) {
      setCameraError("QR scanner is still loading. Please wait a moment then try again.");
      return;
    }
    if (scanningRef.current) return;
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
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setCameraError(e?.message ?? "Camera access denied. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    scanningRef.current = false;
    setScanning(false);
    lastScannedCode.current = null;
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) { processCode(manualCode.trim()); setManualCode(""); }
  };

  const ResultCard = () => {
    if (!result) return null;

    if (result.status === "success") return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-5 flex items-start gap-4">
        <CheckCircle2 size={32} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-300 text-lg">ADMITTED ✓</p>
          <p className="text-foreground font-semibold">{result.name}</p>
          <p className="text-muted-foreground text-sm">{result.package_type} × {result.quantity}</p>
        </div>
      </div>
    );

    if (result.status === "already_used") return (
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

    if (result.status === "not_found") return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-5 flex items-start gap-4">
        <XCircle size={32} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-300 text-lg">TICKET NOT FOUND</p>
          <p className="text-muted-foreground text-sm">This ticket code does not exist in the system.</p>
        </div>
      </div>
    );

    if (result.status === "unpaid") return (
      <div className="rounded-xl bg-orange-500/10 border border-orange-500/40 p-5 flex items-start gap-4">
        <AlertTriangle size={32} className="text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-orange-300 text-lg">PAYMENT NOT COMPLETE</p>
          <p className="text-foreground font-semibold">{result.name}</p>
          <p className="text-muted-foreground text-sm">Status: {result.payment_status}</p>
        </div>
      </div>
    );

    if (result.status === "error") return (
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

  const filteredScans = scans.filter((s) =>
    s.ticket_code.toLowerCase().includes(searchScans.toLowerCase()) ||
    s.registrations?.name.toLowerCase().includes(searchScans.toLowerCase()) ||
    s.registrations?.email.toLowerCase().includes(searchScans.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">QR Scanner</h1>
          <button onClick={fetchScans} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <QrCode size={20} /> Scan Ticket
              </h2>

              {!cameraActive ? (
                <button onClick={startCamera} disabled={!jsQRLoaded}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                  {jsQRLoaded ? "Start Camera" : "Loading Scanner..."}
                </button>
              ) : (
                <button onClick={stopCamera}
                  className="w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-semibold">
                  Stop Camera
                </button>
              )}

              {cameraError && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{cameraError}</div>
              )}

              <div className="mt-4 relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" muted playsInline autoPlay />
                <canvas ref={canvasRef} className="hidden" />
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Scanning overlay */}
                    <div className="relative w-48 h-48">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-md" />
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-2">
                Point camera at QR code on ticket — or enter code below
              </p>

              <form onSubmit={handleManual} className="mt-3 flex gap-2">
                <input ref={inputRef} type="text" value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter ticket code e.g. CSA-AS5WDKHP4"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <button type="submit" disabled={scanning || !manualCode.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 text-sm">
                  {scanning ? "Checking..." : "Submit"}
                </button>
              </form>
            </div>

            {result && <ResultCard />}
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><List size={20} /> Recent Scans ({scans.length})</h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={searchScans} onChange={(e) => setSearchScans(e.target.value)}
                  placeholder="Search..." className="pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
            </div>

            {loadingScans ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket size={32} className="mx-auto mb-2 opacity-50" />
                <p>No scans yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredScans.map((scan) => (
                  <div key={scan.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{scan.registrations?.name || "Unknown"}</p>
                        <p className="text-sm text-primary font-mono">{scan.ticket_code}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {scan.registrations?.package_type} × {scan.registrations?.quantity}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock size={12} /> {fmt(scan.scanned_at)}
                        </p>
                        {scan.scanned_by && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 justify-end">
                            <User size={12} /> {scan.scanned_by}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminQRScanner;
