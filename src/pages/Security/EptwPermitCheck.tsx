import { FormEvent, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

type PermitArea = {
  name: string;
  code?: string;
};

type PermitCheckData = {
  valid: boolean;
  letter_number: string;
  request_number: string;
  vendor: string;
  classification: string;
  start_date: string | null;
  expired_date: string | null;
  status: {
    id: number;
    name: string;
  };
  areas: PermitArea[];
};

type PermitCheckResponse = {
  result: boolean;
  found: boolean;
  valid: boolean;
  message?: string;
  data?: PermitCheckData;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default function EptwPermitCheck() {
  const { toast } = useToast();
  const [permitNumber, setPermitNumber] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PermitCheckResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPermitNumber = permitNumber.trim();

    if (!trimmedPermitNumber) {
      toast({
        title: "Nomor PTW belum diisi",
        description: "Masukkan nomor PTW atau nomor request yang ditunjukkan pegawai.",
        variant: "destructive",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast({
        title: "Sesi tidak ditemukan",
        description: "Silakan login ulang untuk melanjutkan.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/eptw/permit/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permit_number: trimmedPermitNumber }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Gagal mengecek nomor PTW.");
      }

      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengecek nomor PTW.";
      setResult({
        result: false,
        found: false,
        valid: false,
        message,
      });
      toast({
        title: "Pengecekan gagal",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const statusTone = result?.valid
    ? "border-green-200 bg-green-50 text-green-800"
    : result?.found
      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className="container mx-auto p-6 space-y-8 relative">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pengecekan ePTW</h1>
          <p className="text-white mt-1">Validasi nomor PTW atau nomor request untuk patroli security</p>
        </div>
        <Badge className="w-fit bg-white/20 text-white hover:bg-white/20">
          <ShieldCheck className="mr-2 h-4 w-4" />
          AK4L Patrol
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="surface-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Cek Nomor PTW / Request
            </CardTitle>
            <CardDescription>Masukkan nomor PTW dokumen atau nomor request ePTW pegawai.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="permitNumber">Nomor PTW / Request</Label>
                <Input
                  id="permitNumber"
                  value={permitNumber}
                  onChange={(event) => setPermitNumber(event.target.value)}
                  placeholder="Contoh: 001/PTW/2026-1 atau 0101"
                  autoComplete="off"
                  className="uppercase"
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={isChecking}>
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengecek...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Cek ePTW
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {!result && (
            <Card className="surface-1">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center min-h-[220px] text-muted-foreground">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                    <BadgeCheck className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">Hasil pengecekan akan tampil di sini</p>
                  <p className="mt-2 max-w-md text-sm">
                    Gunakan nomor PTW lengkap atau nomor request internal ePTW.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="surface-1">
              <CardHeader>
                <div className={`flex items-start gap-3 rounded-lg border p-4 ${statusTone}`}>
                  {result.valid ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : result.found ? (
                    <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
                  )}
                  <div>
                    <CardTitle className="text-xl">
                      {result.valid ? "PTW Valid" : result.found ? "PTW Ditemukan, Tidak Aktif" : "PTW Tidak Valid"}
                    </CardTitle>
                    <CardDescription className="mt-1 text-current opacity-80">
                      {result.message ||
                        (result.valid
                          ? "Nomor PTW dapat diterima untuk pemeriksaan lapangan."
                          : "Nomor PTW tidak dapat digunakan untuk aktivitas saat ini.")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {result.data && (
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem label="Nomor PTW" value={result.data.letter_number} />
                    <InfoItem label="Nomor Request" value={result.data.request_number} />
                    <InfoItem label="Vendor" value={result.data.vendor || "-"} />
                    <InfoItem label="Klasifikasi" value={result.data.classification || "-"} />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Mulai
                      </div>
                      <p className="mt-2 font-semibold">{formatDate(result.data.start_date)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Berakhir
                      </div>
                      <p className="mt-2 font-semibold">{formatDate(result.data.expired_date)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge className="mt-2 bg-secondary text-secondary-foreground hover:bg-secondary">
                        {result.data.status?.name || "-"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      Area Kerja
                    </div>
                    {result.data.areas?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.data.areas.map((area, index) => (
                          <div key={`${area.code}-${area.name}-${index}`} className="rounded-lg border p-3">
                            <p className="font-medium">{area.name}</p>
                            <p className="text-sm text-muted-foreground">{area.code || "-"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Area belum tersedia</AlertTitle>
                        <AlertDescription>Data area tidak dikirim dari ePTW.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
