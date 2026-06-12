import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  QrCode, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Search, List, Clock, User, Ticket, Ban, Camera, CameraOff, Users, UserCheck
} from "lucide-react";

interface ScanRecord {
  id: string;
  ticket_code: string;
  scanned_at: string;
  scanned_by: string | null;
  notes: string | null;
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
  | { status: "success"; name: string; package_type: string; totalCapacity: number; admittedCount: number; alreadyScanned: false; admittedNames: string[] }
  | { status: "capacity_full"; name: string; package_type: string; totalCapacity: number; lastScanned_at: string; lastScanned_by: string | null; admittedNames: string[] }
  | { status: "not_found" }
  | { status: "unpaid"; name: string; payment_status: string }
  | { status: "error"; message: string };

/** Pending admission: QR decoded, capacity available, waiting for attendee name */
interface PendingAdmission {
  registrationId: string;
  scanCode: string;
  holderName: string;
  packageType: string;
  totalCapacity: number;
  admittedSoFar: number;
  /** Names already admitted on this ticket (for display) */
  admittedNames: string[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Extracts the canonical ticket code from whatever the QR contains.
 * Returns { displayCode, rawToken } where:
 *   - displayCode  is always uppercased (used for ticket_code lookup, e.g. "CSA-XXXX")
 *   - rawToken     preserves original casing (used for secure_ticket_token lookup —
 *                  UUIDs are stored lowercase in Supabase and are case-sensitive)
 *
 * Handles:
 *  1. JSON payload  {"t":"CSA-XX","b":"CSA-XX","q":"uuid-token"} → t/b for code, q for token
 *  2. URL           https://…/ticket/CSA-XX?token=uuid           → path for code, param for token
 *  3. Plain string  CSA-AS5WDKHP4  OR  a3f2b1c4-uuid            → same value for both
 */
function extractCode(raw: string): { displayCode: string; rawToken: string } {
  const trimmed = raw.trim();

  // 1. Try JSON
  try {
    const parsed = JSON.parse(trimmed);
    const codeCandidate  = parsed.t || parsed.b || "";
    const tokenCandidate = parsed.q || codeCandidate;
    if (codeCandidate) {
      return {
        displayCode: String(codeCandidate).toUpperCase(),
        rawToken:    String(tokenCandidate), // preserve original casing for UUID tokens
      };
    }
  } catch { /* not JSON */ }

  // 2. Try URL
  try {
    const url = new URL(trimmed);
    const tokenParam = url.searchParams.get("token") || url.searchParams.get("code");
    const pathMatch  = url.pathname.match(/\/ticket\/([A-Za-z0-9-]+)/i);
    const pathCode   = pathMatch ? pathMatch[1] : null;
    if (pathCode || tokenParam) {
      const code  = pathCode || tokenParam!;
      const token = tokenParam || pathCode!;
      return { displayCode: code.toUpperCase(), rawToken: token };
    }
  } catch { /* not a URL */ }

  // 3. Plain string — could be a CSA-XXXX ticket code OR a UUID secure token.
  //    Uppercase displayCode for ticket_code lookup; keep rawToken as-is for UUID lookup.
  return { displayCode: trimmed.toUpperCase(), rawToken: trimmed };
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
  const [cameraLoading, setCameraLoading] = useState(false);
  const lastScannedCode = useRef<string | null>(null);
  const [jsQRLoaded, setJsQRLoaded] = useState(false);
  // For multi-seat tickets: holds decoded ticket info while admin enters the attendee name
  const [pendingAdmission, setPendingAdmission] = useState<PendingAdmission | null>(null);
  const [seatName, setSeatName] = useState("");
  const [admitting, setAdmitting] = useState(false);
  const seatNameRef = useRef<HTMLInputElement>(null);

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
      .select(`id, ticket_code, scanned_at, scanned_by, notes,
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
    // displayCode is uppercased for ticket_code lookup (e.g. "CSA-XXXX")
    // rawToken preserves original casing for secure_ticket_token lookup (UUIDs are lowercase)
    const { displayCode: code, rawToken } = extractCode(raw);
    if (!code) return;

    scanningRef.current = true;
    setScanning(true);
    setResult(null);

    try {
      // 1. Look up by ticket_code (plain CSA-XXXX codes, always uppercase)
      let { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select("id, name, package_type, quantity, payment_status, ticket_code")
        .eq("ticket_code", code)
        .maybeSingle();

      if (regErr) { setResult({ status: "error", message: regErr.message }); return; }

      // 2. If not found by ticket_code, try secure_ticket_token (UUID, case-sensitive, stored lowercase)
      if (!reg) {
        const { data: regByToken, error: tokenErr } = await supabase
          .from("registrations")
          .select("id, name, package_type, quantity, payment_status, ticket_code")
          .eq("secure_ticket_token", rawToken)
          .maybeSingle();
        if (tokenErr) { setResult({ status: "error", message: tokenErr.message }); return; }
        reg = regByToken;
        if (reg) {
          // normalise to the real ticket_code for the scan record
          (reg as any)._useCode = reg.ticket_code ?? code;
        }
      }

      if (!reg) { setResult({ status: "not_found" }); return; }

      const scanCode = (reg as any)._useCode ?? code;

      // 3. Payment check — valid statuses: paid, partial (schema: pending/paid/partial/failed/refunded)
      if (reg.payment_status !== "paid" && reg.payment_status !== "partial") {
        setResult({ status: "unpaid", name: reg.name, payment_status: reg.payment_status });
        return;
      }

      // 4. Capacity check — count how many have already been admitted on this ticket
      const totalCapacity = Number(reg.quantity) || 1;
      const { data: existingScans, error: scanCountErr } = await supabase
        .from("ticket_scans")
        .select("scanned_at, scanned_by")
        .eq("ticket_code", scanCode)
        .order("scanned_at", { ascending: false });

      if (scanCountErr) { setResult({ status: "error", message: scanCountErr.message }); return; }

      const admittedSoFar = existingScans?.length ?? 0;

      // Extract names already admitted from notes fields
      const admittedNames = (existingScans ?? [])
        .map(s => {
          // notes format: "Seat N of M · Name" — extract the name after " · "
          const m = (s as any).notes?.match(/·\s*(.+)$/);
          return m ? m[1].trim() : null;
        })
        .filter(Boolean) as string[];

      if (admittedSoFar >= totalCapacity) {
        // All seats on this ticket have been used
        const lastScan = existingScans![0];
        setResult({
          status: "capacity_full",
          name: reg.name,
          package_type: reg.package_type,
          totalCapacity,
          lastScanned_at: lastScan.scanned_at,
          lastScanned_by: (lastScan as any).scanned_by,
          admittedNames,
        });
        return;
      }

      // 5a. Multi-seat ticket → pause camera and ask for attendee name before admitting
      if (totalCapacity > 1) {
        setPendingAdmission({
          registrationId: reg.id,
          scanCode,
          holderName:     reg.name,
          packageType:    reg.package_type,
          totalCapacity,
          admittedSoFar,
          admittedNames,
        });
        setSeatName("");
        // Pause camera scanning while name is being entered
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        setTimeout(() => seatNameRef.current?.focus(), 50);
        // Release the scan lock so the form can submit
        scanningRef.current = false;
        setScanning(false);
        return;
      }

      // 5b. Single-seat ticket → admit immediately (no name needed)
      const { error: insertErr } = await supabase.from("ticket_scans").insert({
        registration_id: reg.id,
        ticket_code: scanCode,
        scanned_by: user?.email ?? null,
        device_info: navigator.userAgent,
        notes: null,
      });

      if (insertErr) { setResult({ status: "error", message: insertErr.message }); return; }

      setResult({
        status: "success",
        name: reg.name,
        package_type: reg.package_type,
        totalCapacity: 1,
        admittedCount: 1,
        admittedNames: [],
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

  // restartCamera: safe to call from confirm/cancel without circular dep on tick
  const restartCamera = useCallback(() => {
    if (streamRef.current && !rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /** Called when admin confirms a name for a multi-seat ticket admission */
  const confirmSeatAdmission = useCallback(async () => {
    if (!pendingAdmission || admitting) return;
    const name = seatName.trim();
    if (!name) { seatNameRef.current?.focus(); return; }

    setAdmitting(true);
    const { admittedSoFar, totalCapacity, registrationId, scanCode, holderName, packageType, admittedNames } = pendingAdmission;

    const { error: insertErr } = await supabase.from("ticket_scans").insert({
      registration_id: registrationId,
      ticket_code: scanCode,
      scanned_by: user?.email ?? null,
      device_info: navigator.userAgent,
      notes: `Seat ${admittedSoFar + 1} of ${totalCapacity} · ${name}`,
    });

    setAdmitting(false);

    if (insertErr) {
      setResult({ status: "error", message: insertErr.message });
      setPendingAdmission(null);
      setSeatName("");
      return;
    }

    const newAdmittedCount = admittedSoFar + 1;
    const newAdmittedNames = [...admittedNames, name];
    setResult({
      status: "success",
      name: holderName,
      package_type: packageType,
      totalCapacity,
      admittedCount: newAdmittedCount,
      admittedNames: newAdmittedNames,
      alreadyScanned: false,
    });
    setPendingAdmission(null);
    setSeatName("");
    toast.success(`✅ Admitted: ${name} (seat ${newAdmittedCount}/${totalCapacity} on ${holderName})`);
    fetchScans();

    restartCamera();
  }, [pendingAdmission, seatName, admitting, user, fetchScans, restartCamera]);

  const cancelPendingAdmission = useCallback(() => {
    setPendingAdmission(null);
    setSeatName("");
    scanningRef.current = false;
    lastScannedCode.current = null;
    restartCamera();
  }, [restartCamera]);

  const startCamera = async () => {
    if (!jsQRLoaded) { setCameraError("QR scanner is still loading. Please wait a moment then try again."); return; }
    if (cameraLoading || cameraActive) return;
    setCameraError(null);
    setCameraLoading(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // fallback: any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // FIX 7: Wait until video can actually play before scanning
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          if (v.readyState >= v.HAVE_ENOUGH_DATA) { resolve(); return; }
          v.oncanplay = () => resolve();
          setTimeout(resolve, 3000); // safety timeout
          v.play().catch(() => resolve());
        });
      }
      setCameraActive(true);
      setCameraLoading(false);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setCameraLoading(false);
      const msg = e?.message ?? "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setCameraError("Camera permission denied. Allow camera access in your browser settings, then try again.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCameraError("No camera found on this device. Use the manual code entry below.");
      } else {
        setCameraError(`Camera error: ${msg || "Unknown"}. Use the manual code entry below.`);
      }
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
        <div className="flex-1">
          <p className="font-bold text-emerald-300 text-lg">ADMITTED ✓</p>
          <p className="text-foreground font-semibold">{result.name}</p>
          <p className="text-muted-foreground text-sm">{result.package_type}</p>
          {result.totalCapacity > 1 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-semibold">
                  {result.admittedCount} of {result.totalCapacity} seats admitted
                </span>
                {result.admittedCount < result.totalCapacity && (
                  <span className="text-muted-foreground">
                    {result.totalCapacity - result.admittedCount} seat{result.totalCapacity - result.admittedCount !== 1 ? "s" : ""} remaining
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: result.totalCapacity }).map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-full ${i < result.admittedCount ? "bg-emerald-400" : "bg-muted"}`} />
                ))}
              </div>
              {result.admittedNames.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Admitted so far</p>
                  {result.admittedNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-foreground">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (result.status === "capacity_full") return (
      <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/40 p-5 flex items-start gap-4">
        <Ban size={32} className="text-yellow-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-yellow-300 text-lg">
            {result.totalCapacity > 1 ? `ALL ${result.totalCapacity} SEATS USED` : "TICKET ALREADY USED"}
          </p>
          <p className="text-foreground font-semibold">{result.name}</p>
          <p className="text-muted-foreground text-sm">{result.package_type}</p>
          {result.totalCapacity > 1 && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1">
                {Array.from({ length: result.totalCapacity }).map((_, i) => (
                  <div key={i} className="h-2 flex-1 rounded-full bg-yellow-400" />
                ))}
              </div>
              {result.admittedNames.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">All admitted</p>
                  {result.admittedNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={13} className="text-yellow-400 shrink-0" />
                      <span className="text-foreground">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-xs mt-2">
            Last scan {fmt(result.lastScanned_at)}{result.lastScanned_by ? ` by ${result.lastScanned_by}` : ""}
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
                <button onClick={startCamera} disabled={!jsQRLoaded || cameraLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                  {cameraLoading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Starting Camera...</>
                    : <><Camera size={18}/>{jsQRLoaded ? "Start Camera" : "Loading Scanner..."}</>}
                </button>
              ) : (
                <button onClick={stopCamera}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive text-destructive-foreground font-semibold">
                  <CameraOff size={18}/> Stop Camera
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

            {/* ── Multi-seat name entry prompt ── */}
            {pendingAdmission && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/40 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Users size={28} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-blue-300 text-lg">GROUP TICKET — ENTER ATTENDEE NAME</p>
                    <p className="text-foreground font-semibold">{pendingAdmission.holderName}</p>
                    <p className="text-muted-foreground text-sm">{pendingAdmission.packageType}</p>

                    {/* Seat progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-blue-300 font-semibold">
                          Admitting seat {pendingAdmission.admittedSoFar + 1} of {pendingAdmission.totalCapacity}
                        </span>
                        <span className="text-muted-foreground">
                          {pendingAdmission.totalCapacity - pendingAdmission.admittedSoFar - 1} remaining after this
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: pendingAdmission.totalCapacity }).map((_, i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full ${
                            i < pendingAdmission.admittedSoFar ? "bg-emerald-400"
                            : i === pendingAdmission.admittedSoFar ? "bg-blue-400 animate-pulse"
                            : "bg-muted"
                          }`} />
                        ))}
                      </div>
                    </div>

                    {/* Previously admitted names */}
                    {pendingAdmission.admittedNames.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Already admitted</p>
                        {pendingAdmission.admittedNames.map((n, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <UserCheck size={12} className="text-emerald-400 shrink-0" />
                            <span className="text-foreground">{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name input */}
                <div className="flex gap-2">
                  <input
                    ref={seatNameRef}
                    type="text"
                    value={seatName}
                    onChange={(e) => setSeatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmSeatAdmission(); }}
                    placeholder="Type attendee's full name…"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-blue-500/40 bg-background text-sm focus:outline-none focus:border-blue-400"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmSeatAdmission}
                    disabled={admitting || !seatName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 text-sm"
                  >
                    {admitting
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Admitting…</>
                      : <><UserCheck size={16} /> Admit — Seat {pendingAdmission.admittedSoFar + 1}</>
                    }
                  </button>
                  <button
                    onClick={cancelPendingAdmission}
                    disabled={admitting}
                    className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
                          {scan.registrations?.package_type}
                          {(scan.registrations?.quantity ?? 1) > 1 && (
                            <span className="ml-1 font-semibold text-primary">
                              · capacity {scan.registrations?.quantity}
                            </span>
                          )}
                        </p>
                        {scan.notes && (() => {
                          const seatMatch = scan.notes.match(/^(Seat \d+ of \d+)\s*·\s*(.+)$/);
                          return seatMatch ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <UserCheck size={11} className="text-emerald-400 shrink-0" />
                              <span className="text-xs text-emerald-300 font-medium">{seatMatch[2]}</span>
                              <span className="text-xs text-muted-foreground">({seatMatch[1]})</span>
                            </div>
                          ) : null;
                        })()}
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
