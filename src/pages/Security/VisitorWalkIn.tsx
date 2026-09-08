import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Save, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { visitorInvitationApi, WalkInVisitorPayload } from "@/lib/visitorInvitations";

const initialForm: WalkInVisitorPayload = {
  visitor_name: "",
  visitor_company: "",
  purpose: "",
  host_name: "",
  notes: "",
};

export default function VisitorWalkIn() {
  const { toast } = useToast();
  const [form, setForm] = useState<WalkInVisitorPayload>(initialForm);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field: keyof WalkInVisitorPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccessMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Sesi tidak ditemukan", description: "Silakan login ulang.", variant: "destructive" });
      return;
    }

    const payload = {
      visitor_name: form.visitor_name.trim(),
      visitor_company: form.visitor_company?.trim() || undefined,
      purpose: form.purpose.trim(),
      host_name: form.host_name?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    if (!payload.visitor_name || !payload.purpose) {
      toast({ title: "Data belum lengkap", description: "Nama visitor dan keperluan wajib diisi.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const response = await visitorInvitationApi.createWalkIn(token, payload);
      setForm(initialForm);
      setSuccessMessage(response.message || "Visitor walk-in berhasil dicatat.");
      toast({ title: "Walk-in dicatat", description: "Visitor langsung masuk daftar monitoring." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mencatat visitor walk-in.";
      toast({ title: "Gagal menyimpan", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Walk-in Visitor</h1>
          <p className="text-sm sm:text-base text-white/90">Catat tamu tanpa undangan QR untuk kebutuhan operasional pos.</p>
        </div>
        <Badge className="w-fit bg-white/20 text-white hover:bg-white/20">
          <UserPlus className="mr-2 h-4 w-4" />
          Input Manual
        </Badge>
      </div>

      <Card className="surface-1 mx-auto max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Data Visitor
          </CardTitle>
          <CardDescription>Isi data yang diperlukan security. Visitor akan langsung berstatus di lokasi.</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Berhasil</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor-name">Nama Visitor *</Label>
              <Input
                id="visitor-name"
                value={form.visitor_name}
                onChange={(event) => updateField("visitor_name", event.target.value)}
                className="h-12 text-base"
                placeholder="Nama tamu"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitor-company">Perusahaan / Instansi</Label>
              <Input
                id="visitor-company"
                value={form.visitor_company}
                onChange={(event) => updateField("visitor_company", event.target.value)}
                className="h-12 text-base"
                placeholder="Opsional"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host-name">Host / Tujuan</Label>
              <Input
                id="host-name"
                value={form.host_name}
                onChange={(event) => updateField("host_name", event.target.value)}
                className="h-12 text-base"
                placeholder="Nama pegawai/unit yang dituju"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Keperluan *</Label>
              <Textarea
                id="purpose"
                value={form.purpose}
                onChange={(event) => updateField("purpose", event.target.value)}
                placeholder="Contoh: koordinasi vendor, meeting, pengantaran dokumen"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Pos</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Opsional"
                rows={3}
              />
            </div>

            <Button type="submit" className="h-14 w-full text-base" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Simpan Walk-in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
