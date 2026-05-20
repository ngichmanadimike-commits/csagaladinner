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
  const [jsQRLoaded, setJsQRLoaded] = useState(!!(window as any).jsQR);

  useEffect(() => {
    if ((window as any).jsQR) { setJsQRLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
    s.onload = () => setJsQRLoaded(true);
    s.onerror = () => setCameraError("Failed to load QR library. Check your internet connection.");
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

    scanningRef.current = true;
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

      if (reg.payment_status!== "paid" && reg.payment_status!== "verified" && reg.payment_status!== "confirmed") {
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
        scanned_by: user?.email?? null,
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
    const jsQR = (window as any).jsQR;
    if (!video ||!canvas ||!jsQR || video.readyState!== video.HAVE_ENOUGH_DATA) {
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
    if (code && code.data && code.data!== lastScannedCode.current) {
      lastScannedCode.current = code.data;
      processCode(code.data);
      setTimeout(() => { lastScannedCode.current = null; }, 3000);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [processCode]);

  const startCamera = async () => {
    if (!jsQRLoaded) {
      setCameraError("QR scanner library is still loading. Please wait a moment and try again.");
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
      setCameraError(e?.message?? "Camera access denied");
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
    if (result.status === "success")
      return (
        <div className="rounded-xl bg-emerald-500/10 border-emerald-500/40 p-5 flex items-start gap-4">
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
        <div className="rounded-xl bg-yellow-500/10 border-yellow-500/40 p-5 flex items-start gap-4">
          <Ban size={32} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-300 text-lg">TICKET ALREADY USED</p>
            <p className="text-foreground font-semibold">{result.name}</p>
            <p className="text-muted-foreground text-sm">
              First scanned {fmt(result.scanned_at)}{result.scanned_by? ` by ${result.scanned_by}` : ""}
            </p>
          </div>
        </div>
      );
    if (result.status === "not_found")
      return (
        <div className="rounded-xl bg-red-500/10 border-red-500/40 p-5 flex items-start gap-4">
