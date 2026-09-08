import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  LogIn,
  LogOut,
  Loader2,
  MapPin,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  VisitorInvitation,
  VisitorInvitationError,
  VisitorInvitationResponse,
  VisitorLocation,
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
  READY_FOR_CHECKIN: "Siap Check-in",
  CHECKED_IN: "Sudah Check-in",
  CHECKED_OUT: "Sudah Check-out",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Expired",
  NO_SHOW: "No-show",
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

const getStatusBadge = (status: string) => {
  if (status === "READY_FOR_CHECKIN") return <Badge variant="warning">{statusLabel[status]}</Badge>;
  if (status === "CHECKED_IN") return <Badge variant="success">{statusLabel[status]}</Badge>;
  if (status === "CHECKED_OUT") return <Badge variant="secondary">{statusLabel[status]}</Badge>;
  if (["CANCELLED", "EXPIRED", "NO_SHOW"].includes(status)) {
    return <Badge variant="destructive">{statusLabel[status] || status}</Badge>;
  }

  return <Badge variant="outline">{statusLabel[status] || status || "Tidak diketahui"}</Badge>;
};

export default function VisitorManagement() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef("");

  const [locations, setLocations] = useState<VisitorLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [activeQr, setActiveQr] = useState("");
  const [result, setResult] = useState<VisitorInvitationResponse | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const token = localStorage.getItem("token");
  const selectedLocation = locations.find((location) => location.id === selectedLocationId);
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

  const loadLocations = useCallback(async () => {
    if (!token) {
      setLocationsLoading(false);
      setLocationsError("Sesi tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLocationsLoading(true);
    setLocationsError("");

    try {
      const data = await visitorInvitationApi.locations(token);
      setLocations(data);
      setSelectedLocationId((current) => current || data[0]?.id || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat lokasi visitor.";
      setLocationsError(message);
      toast({
        title: "Lokasi gagal dimuat",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLocationsLoading(false);
    }
  }, [toast, token]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => stopCamera, [stopCamera]);

  const submitQr = useCallback(
    async (rawQr: string) => {
      const qr = rawQr.trim();

      if (!token) {
        toast({
          title: "Sesi tidak ditemukan",
          description: "Silakan login ulang untuk melanjutkan.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedLocationId) {
        toast({
          title: "Lokasi belum dipilih",
          description: "Pilih lokasi aktif sebelum scan QR visitor.",
          variant: "destructive",
        });
        return;
      }

      if (!QR_PATTERN.test(qr)) {
        const invalidResult = {
          valid: false,
          message: "Format QR visitor tidak valid.",
        };
        setResult(invalidResult);
        setActiveQr("");
        toast({
          title: "QR tidak valid",
          description: invalidResult.message,
          variant: "destructive",
        });
        return;
      }

      setScanState("verifying");
      setResult(null);
      setActiveQr(qr);

      try {
        const response = await visitorInvitationApi.verifyQr(token, {
          qr,
          location_id: selectedLocationId,
        });
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
        setResult({
          valid: false,
          message,
        });
        toast({
          title: error instanceof VisitorInvitationError && error.retryable ? "Validasi perlu dicoba ulang" : "Validasi gagal",
          description: message,
          variant: "destructive",
        });
      } finally {
        setScanState("idle");
      }
    },
    [selectedLocationId, toast, token],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQr(qrInput);
  };

  const runOperationalAction = async (action: "check-in" | "check-out") => {
    if (!token || !activeQr || !selectedLocationId) return;

    setScanState(action === "check-in" ? "checking-in" : "checking-out");

    try {
      const response =
        action === "check-in"
          ? await visitorInvitationApi.checkIn(token, { qr: activeQr, location_id: selectedLocationId })
          : await visitorInvitationApi.checkOut(token, { qr: activeQr, location_id: selectedLocationId });

      setResult(response);
      toast({
        title: action === "check-in" ? "Check-in berhasil" : "Check-out berhasil",
        description: response.invitation?.invitation_number || "Status visitor berhasil diperbarui.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aksi visitor gagal diproses.";
      setResult((current) => ({
        valid: false,
        message,
        invitation: current?.invitation,
      }));
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
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
          setCameraError("Kamera aktif, tetapi QR belum bisa dibaca. Arahkan ulang atau gunakan input manual.");
        }

        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };

      scanLoopRef.current = window.requestAnimationFrame(scanFrame);
    } catch {
      setCameraError("Kamera tidak dapat diakses. Periksa izin browser atau gunakan input manual.");
      stopCamera();
    }
  };

  const detailItems = [
    ["Visitor", invitation?.visitor_name || "-"],
    ["Perusahaan", invitation?.visitor_company || "-"],
    ["Jumlah", `${invitation?.visitor_count || 1} visitor`],
    ["Host", invitation?.host || "-"],
    ["Lokasi", invitation?.location || selectedLocation?.name || "-"],
    ["Area", invitation?.area || "-"],
  ];

  return (
    <div className="container mx-auto p-6 space-y-8 relative">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Visitor Invitation Checkpoint</h1>
          <p className="text-white mt-1">Scan QR invitation Intranet untuk validasi check-in dan check-out visitor.</p>
        </div>
        <Badge className="w-fit bg-white/20 text-white hover:bg-white/20">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Security AK4L
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="surface-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan QR Visitor
            </CardTitle>
            <CardDescription>Pilih lokasi aktif lalu scan QR invitation dari email atau public portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="visitor-location">Lokasi Aktif</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(value) => {
                  setSelectedLocationId(value);
                  resetScan();
                }}
                disabled={locationsLoading || isBusy}
              >
                <SelectTrigger id="visitor-location">
                  <SelectValue placeholder={locationsLoading ? "Memuat lokasi..." : "Pilih lokasi"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locationsError && <p className="text-sm text-destructive">{locationsError}</p>}
              {!locationsLoading && !locationsError && locations.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada lokasi visitor aktif dari Intranet.</p>
              )}
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="visitor-qr">QR Token</Label>
                <Input
                  id="visitor-qr"
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                  placeholder="AK4L|VIS|..."
                  autoComplete="off"
                  disabled={isBusy}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isBusy || !selectedLocationId}
              >
                {scanState === "verifying" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memvalidasi...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Validasi QR
                  </>
                )}
              </Button>
            </form>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={cameraActive ? stopCamera : startCamera} disabled={isBusy}>
                <Camera className="mr-2 h-4 w-4" />
                {cameraActive ? "Stop" : "Kamera"}
              </Button>
              <Button type="button" variant="outline" onClick={resetScan} disabled={isBusy}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border bg-muted/30">
              <video ref={videoRef} className="aspect-video w-full bg-black object-cover" muted playsInline />
            </div>

            {cameraError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scanner kamera</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {!result && (
            <Card className="surface-1">
              <CardContent className="p-8">
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">Hasil validasi akan tampil di sini</p>
                  <p className="mt-2 max-w-md text-sm">
                    AK4L hanya mengirim token QR opaque ke Intranet. Data visitor ditampilkan dari hasil validasi backend.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="surface-1">
              <CardHeader>
                <div
                  className={`flex items-start gap-3 rounded-lg border p-4 ${
                    result.valid ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {result.valid ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
                  )}
                  <div>
                    <CardTitle className="text-xl">{result.valid ? "Invitation valid" : "Invitation ditolak"}</CardTitle>
                    <CardDescription className={result.valid ? "text-green-700" : "text-red-700"}>
                      {result.message || (result.valid ? "Visitor dapat diproses sesuai status terbaru." : "QR tidak dapat dipakai.")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {invitation ? (
                  <>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Nomor Invitation</p>
                        <p className="text-2xl font-bold text-foreground">{invitation.invitation_number || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">{getStatusBadge(status)}</div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailItems.map(([label, value]) => (
                        <div key={label} className="rounded-lg border bg-background p-4">
                          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                          <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    {members.length > 0 && (
                      <div className="rounded-lg border bg-background p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <p className="font-semibold">Anggota Group</p>
                        </div>
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

                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{selectedLocation?.name || "Lokasi AK4L"}</p>
                          <p className="text-sm text-muted-foreground">Aksi akan direvalidasi atomic oleh Intranet.</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {status === "READY_FOR_CHECKIN" && result.valid && (
                          <Button onClick={() => runOperationalAction("check-in")} disabled={isBusy}>
                            {scanState === "checking-in" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <LogIn className="mr-2 h-4 w-4" />
                            )}
                            Check-in
                          </Button>
                        )}
                        {status === "CHECKED_IN" && result.valid && (
                          <Button onClick={() => runOperationalAction("check-out")} disabled={isBusy}>
                            {scanState === "checking-out" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="mr-2 h-4 w-4" />
                            )}
                            Check-out
                          </Button>
                        )}
                        {!["READY_FOR_CHECKIN", "CHECKED_IN"].includes(status) && (
                          <Badge variant="outline" className="justify-center py-2">
                            Tidak ada aksi operasional
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>QR tidak dapat dipakai</AlertTitle>
                    <AlertDescription>{result.message || "QR invalid, expired, cancelled, lokasi salah, atau waktu tidak sesuai."}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="surface-1">
              <CardContent className="flex items-start gap-3 p-5">
                <Building2 className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Lokasi dari Intranet</p>
                  <p className="text-sm text-muted-foreground">Daftar lokasi aktif diambil dari API, bukan hardcode di AK4L.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="surface-1">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Token QR tidak disimpan</p>
                  <p className="text-sm text-muted-foreground">QR hanya disimpan sementara di memori selama proses validasi operasional.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
