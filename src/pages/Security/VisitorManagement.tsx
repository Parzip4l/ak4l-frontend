import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  LogIn,
  LogOut,
  Loader2,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  VisitorInvitation,
  VisitorInvitationError,
  VisitorInvitationResponse,
  visitorInvitationApi,
} from "@/lib/visitorInvitations";

type ScanState = "idle" | "verifying" | "checking-in" | "checking-out";
type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const QR_PATTERN = /^AK4L\|VIS\|[a-fA-F0-9]{64}$/;

const statusLabel: Record<string, string> = {
  READY_FOR_CHECKIN: "Siap check-in",
  CHECKED_IN: "Sedang di lokasi",
  CHECKED_OUT: "Sudah check-out",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Expired",
  NO_SHOW: "No-show",
};

const getStatusBadge = (status: string) => {
  if (status === "READY_FOR_CHECKIN") return <Badge variant="warning">{statusLabel[status]}</Badge>;
  if (status === "CHECKED_IN") return <Badge variant="success">{statusLabel[status]}</Badge>;
  if (status === "CHECKED_OUT") return <Badge variant="secondary">{statusLabel[status]}</Badge>;
  if (["CANCELLED", "EXPIRED", "NO_SHOW"].includes(status)) return <Badge variant="destructive">{statusLabel[status]}</Badge>;

  return <Badge variant="outline">{statusLabel[status] || status || "Tidak diketahui"}</Badge>;
};

const normalizeMembers = (members?: VisitorInvitation["members"]) => {
  if (!Array.isArray(members)) return [];

  return members
    .map((member) => {
      if (typeof member === "string") return member;
      if (member && typeof member === "object" && "name" in member) return String(member.name);
      return "";
    })
    .filter(Boolean);
};

export default function VisitorManagement() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef("");

  const [qrInput, setQrInput] = useState("");
  const [activeQr, setActiveQr] = useState("");
  const [result, setResult] = useState<VisitorInvitationResponse | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const token = localStorage.getItem("token");
  const invitation = result?.invitation;
  const status = invitation?.status || "";
  const members = normalizeMembers(invitation?.members);
  const isBusy = scanState !== "idle";

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const resetScan = useCallback(() => {
    stopCamera();
    lastScannedRef.current = "";
    setQrInput("");
    setActiveQr("");
    setResult(null);
    setCameraError("");
  }, [stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  const submitQr = useCallback(
    async (rawQr: string) => {
      const qr = rawQr.trim();

      if (!token) {
        toast({ title: "Sesi tidak ditemukan", description: "Silakan login ulang untuk melanjutkan.", variant: "destructive" });
        return;
      }

      if (!QR_PATTERN.test(qr)) {
        setResult({ valid: false, message: "Format QR visitor tidak valid." });
        setActiveQr("");
        toast({ title: "QR tidak valid", description: "Format QR visitor tidak valid.", variant: "destructive" });
        return;
      }

      setScanState("verifying");
      setResult(null);
      setActiveQr(qr);

      try {
        const response = await visitorInvitationApi.verifyQr(token, { qr });
        setResult(response);

        if (!response.valid) {
          toast({
            title: "QR ditolak",
            description: response.message || "QR tidak valid untuk lokasi atau waktu ini.",
            variant: "destructive",
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memvalidasi QR visitor.";
        setResult({ valid: false, message });
        toast({
          title: error instanceof VisitorInvitationError && error.retryable ? "Coba ulang" : "Validasi gagal",
          description: message,
          variant: "destructive",
        });
      } finally {
        setScanState("idle");
      }
    },
    [toast, token],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQr(qrInput);
  };

  const runOperationalAction = async (action: "check-in" | "check-out") => {
    if (!token || !activeQr) return;

    setScanState(action === "check-in" ? "checking-in" : "checking-out");

    try {
      const payload = { qr: activeQr };
      const response =
        action === "check-in"
          ? await visitorInvitationApi.checkIn(token, payload)
          : await visitorInvitationApi.checkOut(token, payload);

      setResult(response);
      toast({
        title: action === "check-in" ? "Check-in berhasil" : "Check-out berhasil",
        description: response.invitation?.invitation_number || "Status visitor berhasil diperbarui.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aksi visitor gagal diproses.";
      setResult((current) => ({ valid: false, message, invitation: current?.invitation }));
      toast({
        title: action === "check-in" ? "Check-in gagal" : "Check-out gagal",
        description: message,
        variant: "destructive",
      });
    } finally {
      setScanState("idle");
    }
  };

  const startCamera = async () => {
    setCameraError("");

    if (!window.BarcodeDetector) {
      setCameraError("Scanner kamera belum didukung browser ini. Gunakan input QR manual.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes?.[0]?.rawValue?.trim();

          if (value && value !== lastScannedRef.current && !isBusy) {
            lastScannedRef.current = value;
            setQrInput(value);
            stopCamera();
            await submitQr(value);
            return;
          }
        } catch {
          setCameraError("QR belum terbaca. Arahkan ulang atau pakai input manual.");
        }

        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };

      scanLoopRef.current = window.requestAnimationFrame(scanFrame);
    } catch {
      setCameraError("Kamera tidak dapat diakses. Periksa izin browser atau gunakan input manual.");
      stopCamera();
    }
  };

  const primaryAction =
    status === "READY_FOR_CHECKIN"
      ? { label: "Check-in Visitor", icon: LogIn, onClick: () => runOperationalAction("check-in"), loading: scanState === "checking-in" }
      : status === "CHECKED_IN"
        ? { label: "Check-out Visitor", icon: LogOut, onClick: () => runOperationalAction("check-out"), loading: scanState === "checking-out" }
        : null;

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Scan Visitor</h1>
          <p className="text-sm sm:text-base text-white/90">Scan QR, lalu sistem membaca tujuan kunjungan dari invitation.</p>
        </div>
        <Badge className="w-fit bg-white/20 text-white hover:bg-white/20">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Security AK4L
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <Card className="surface-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScanLine className="h-5 w-5" />
              Pos Scan
            </CardTitle>
            <CardDescription>Scan QR visitor dari email atau portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-black">
              <video ref={videoRef} className="aspect-[4/3] w-full object-cover sm:aspect-video" muted playsInline />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" className="h-12" onClick={cameraActive ? stopCamera : startCamera} disabled={isBusy}>
                <Camera className="mr-2 h-4 w-4" />
                {cameraActive ? "Stop" : "Scan Kamera"}
              </Button>
              <Button type="button" variant="outline" className="h-12" onClick={resetScan} disabled={isBusy}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="visitor-qr">Input Manual</Label>
                <Input
                  id="visitor-qr"
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                  placeholder="AK4L|VIS|..."
                  autoComplete="off"
                  disabled={isBusy}
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" variant="outline" className="h-12 w-full" disabled={isBusy}>
                {scanState === "verifying" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                Validasi QR
              </Button>
            </form>

            {cameraError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scanner</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="surface-1">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Hasil Validasi</CardTitle>
                <CardDescription>Lokasi dan area mengikuti data invitation.</CardDescription>
              </div>
              {invitation && getStatusBadge(status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result && (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-muted-foreground">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <ScanLine className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">Belum ada QR discan</p>
                <p className="mt-1 max-w-sm text-sm">Arahkan kamera ke QR invitation atau tempel token manual.</p>
              </div>
            )}

            {result && !invitation && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>QR ditolak</AlertTitle>
                <AlertDescription>{result.message || "QR invalid, expired, cancelled, lokasi salah, atau waktu tidak sesuai."}</AlertDescription>
              </Alert>
            )}

            {invitation && (
              <>
                <div
                  className={`rounded-lg border p-4 ${
                    result?.valid ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result?.valid ? <CheckCircle2 className="mt-1 h-6 w-6 shrink-0" /> : <XCircle className="mt-1 h-6 w-6 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{invitation.invitation_number || "Invitation"}</p>
                      <p className="text-2xl font-bold leading-tight">{invitation.visitor_name || "-"}</p>
                      <p className="text-sm">{invitation.visitor_company || "Perusahaan tidak tercatat"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Info label="Jumlah" value={`${invitation.visitor_count || 1} orang`} />
                  <Info label="Host" value={invitation.host || "-"} />
                  <Info label="Lokasi" value={invitation.location || "-"} />
                  <Info label="Area" value={invitation.area || "-"} />
                </div>

                {members.length > 0 && (
                  <div className="rounded-lg border bg-background p-4">
                    <p className="mb-2 text-sm font-semibold">Anggota Group</p>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <Badge key={member} variant="secondary">
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {invitation.notes && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Catatan Security</AlertTitle>
                    <AlertDescription>{invitation.notes}</AlertDescription>
                  </Alert>
                )}

                {primaryAction ? (
                  <Button className="h-14 w-full text-base" onClick={primaryAction.onClick} disabled={isBusy || !result?.valid}>
                    {primaryAction.loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <primaryAction.icon className="mr-2 h-5 w-5" />
                    )}
                    {primaryAction.label}
                  </Button>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tidak ada aksi</AlertTitle>
                    <AlertDescription>Status saat ini tidak membuka aksi check-in atau check-out.</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">{value}</p>
    </div>
  );
}
