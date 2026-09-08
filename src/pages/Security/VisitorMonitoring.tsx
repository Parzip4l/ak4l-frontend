import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, RefreshCcw, Search, ShieldCheck, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ActiveVisitor, visitorInvitationApi } from "@/lib/visitorInvitations";

const statusLabel: Record<string, string> = {
  approved: "Terjadwal",
  onsite: "Di lokasi",
  completed: "Selesai",
  CHECKED_IN: "Di lokasi",
  READY_FOR_CHECKIN: "Siap check-in",
  CHECKED_OUT: "Selesai",
};

const statusVariant = (status?: string) => {
  if (status === "onsite" || status === "CHECKED_IN") return "success";
  if (status === "approved" || status === "READY_FOR_CHECKIN") return "warning";
  if (status === "completed" || status === "CHECKED_OUT") return "secondary";
  return "outline";
};

const formatTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function VisitorMonitoring() {
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([]);
  const [date, setDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVisitors = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setError("Sesi tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await visitorInvitationApi.activeVisitors(token);
      setVisitors(response.active_visitors || []);
      setDate(response.date || "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat visitor aktif.";
      setError(message);
      toast({ title: "Monitoring gagal dimuat", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const filteredVisitors = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return visitors;

    return visitors.filter((visitor) => {
      return [
        visitor.visitor_name,
        visitor.visitor_company,
        visitor.purpose,
        visitor.host?.name,
        visitor.status,
      ].some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [searchTerm, visitors]);

  const onsiteCount = visitors.filter((visitor) => visitor.status === "onsite" || visitor.status === "CHECKED_IN").length;
  const scheduledCount = visitors.filter((visitor) => visitor.status === "approved" || visitor.status === "READY_FOR_CHECKIN").length;

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Monitoring Visitor</h1>
          <p className="text-sm sm:text-base text-white/90">Pantau tamu aktif dan jadwal kunjungan hari ini.</p>
        </div>
        <Button className="h-11 w-full sm:w-auto" onClick={loadVisitors} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={Users} label="Total" value={visitors.length} />
        <SummaryCard icon={ShieldCheck} label="Di Lokasi" value={onsiteCount} />
        <SummaryCard icon={CalendarDays} label="Terjadwal" value={scheduledCount} />
      </div>

      <Card className="surface-1">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Daftar Hari Ini</CardTitle>
              <CardDescription>{date || "Tanggal dari server AK4L"}</CardDescription>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari visitor, host, perusahaan"
                className="h-11 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Gagal memuat data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Memuat visitor...
            </div>
          )}

          {!loading && filteredVisitors.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="mb-3 h-10 w-10 text-primary" />
              <p className="font-semibold text-foreground">Tidak ada visitor aktif</p>
              <p className="mt-1 text-sm">Data visitor hari ini akan muncul setelah ada jadwal atau check-in.</p>
            </div>
          )}

          {!loading && filteredVisitors.length > 0 && (
            <div className="space-y-3">
              {filteredVisitors.map((visitor) => (
                <VisitorRow key={visitor.id} visitor={visitor} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="surface-1">
      <CardContent className="p-3 sm:p-4">
        <Icon className="mb-2 h-5 w-5 text-primary" />
        <p className="text-xl sm:text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function VisitorRow({ visitor }: { visitor: ActiveVisitor }) {
  const status = visitor.status || "-";

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{visitor.visitor_name || "-"}</p>
          <p className="text-sm text-muted-foreground">{visitor.visitor_company || "Perusahaan tidak tercatat"}</p>
        </div>
        <Badge variant={statusVariant(status)}>{statusLabel[status] || status}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatTime(visitor.visit_date)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Host: </span>
          <span className="font-medium">{visitor.host?.name || "-"}</span>
        </div>
        <div className="truncate">
          <span className="text-muted-foreground">Tujuan: </span>
          <span className="font-medium">{visitor.purpose || "-"}</span>
        </div>
      </div>
    </div>
  );
}
