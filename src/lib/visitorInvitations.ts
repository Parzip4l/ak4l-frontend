const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export type VisitorLocation = {
  id: string;
  name: string;
  active?: boolean;
  areas?: VisitorArea[];
};

export type VisitorArea = {
  id: string;
  name: string;
  category: "general" | "meeting" | "restricted" | "operational" | "technical";
  requires_approval: boolean;
  active?: boolean;
};

export type VisitorInvitation = {
  id: string;
  invitation_number?: string;
  visitor_name?: string;
  visitor_company?: string;
  visitor_count?: number;
  members?: Array<string | { name?: string }>;
  host?: string;
  location?: string;
  area?: string;
  notes?: string;
  status: string;
};

export type VisitorInvitationResponse = {
  valid: boolean;
  message?: string;
  invitation?: VisitorInvitation;
};

export type ActiveVisitor = {
  id: number | string;
  visitor_name?: string;
  visitor_company?: string;
  purpose?: string;
  visit_date?: string;
  status?: string;
  notes?: string;
  host?: {
    name?: string;
    email?: string;
  } | null;
};

export type ActiveVisitorsResponse = {
  date?: string;
  active_visitors?: ActiveVisitor[];
};

export class VisitorInvitationError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable = false) {
    super(message);
    this.name = "VisitorInvitationError";
    this.status = status;
    this.retryable = retryable;
  }
}

type ApiPayload = {
  qr: string;
  location_id: string;
};

const messageByStatus = (status: number) => {
  if (status === 401) return "Konfigurasi token Visitor Management belum valid. Hubungi admin sistem.";
  if (status === 403) return "Token AK4L tidak memiliki akses untuk aksi visitor ini.";
  if (status === 422) return "QR tidak valid untuk aksi, lokasi, atau waktu ini.";
  if (status === 429) return "Terlalu banyak percobaan scan. Tunggu sebentar lalu coba lagi.";
  if (status >= 500) return "Layanan Visitor Management sedang mengalami gangguan. Silakan coba lagi.";

  return "Request Visitor Management gagal diproses.";
};

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const apiRequest = async <T>(path: string, token: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new VisitorInvitationError(
      payload?.message || messageByStatus(response.status),
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }

  return payload as T;
};

const postQrAction = (path: string, token: string, payload: ApiPayload) => {
  return apiRequest<VisitorInvitationResponse>(path, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const visitorInvitationApi = {
  async locations(token: string): Promise<VisitorLocation[]> {
    const payload = await apiRequest<VisitorLocation[] | { data?: VisitorLocation[]; locations?: VisitorLocation[] }>(
      "/visitor-invitations/locations",
      token,
    );

    if (Array.isArray(payload)) return payload.filter((location) => location.active !== false);
    if (Array.isArray(payload?.locations)) return payload.locations.filter((location) => location.active !== false);
    if (Array.isArray(payload?.data)) return payload.data.filter((location) => location.active !== false);

    return [];
  },

  updateLocations(token: string, locations: VisitorLocation[]) {
    return apiRequest<{ message?: string }>("/visitor-invitations/locations", token, {
      method: "PUT",
      body: JSON.stringify({ locations }),
    });
  },

  verifyQr(token: string, payload: ApiPayload) {
    return postQrAction("/visitor-invitations/verify-qr", token, payload);
  },

  checkIn(token: string, payload: ApiPayload) {
    return postQrAction("/visitor-invitations/check-in", token, payload);
  },

  checkOut(token: string, payload: ApiPayload) {
    return postQrAction("/visitor-invitations/check-out", token, payload);
  },

  async activeVisitors(token: string): Promise<ActiveVisitorsResponse> {
    const payload = await apiRequest<ActiveVisitorsResponse>("/visitor-requests/active", token);

    return {
      date: payload.date,
      active_visitors: Array.isArray(payload.active_visitors) ? payload.active_visitors : [],
    };
  },
};
