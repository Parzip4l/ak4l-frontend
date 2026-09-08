"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Shield,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Clock,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

// Helper to decode JWT token
const decodeToken = (token) => {
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    return JSON.parse(decodedJson);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

export default function Dashboard() {
  // Local state to manage auth info instead of context
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const [safetyMetrics, setSafetyMetrics] = useState({
    fatalities: 0,
    lostTime: 0,
    frequency: 0,
    severity: 0,
    lastUpdate: "-",
  });
  
  const [competencyAnalytics, setCompetencyAnalytics] = useState(null);
  const [pendingReports, setPendingReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const logout = () => {
      localStorage.removeItem('token');
      window.location.reload(); // Simple logout mechanism
  };

  // Security metrics are still mock data
  const securityMetrics = {
    criminalCases: 1,
    bombThreats: 0,
    visits: 45,
    lastUpdate: "2024-01-15",
  };

  // Set user info from token on initial load
  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded.user); 
        setIsAdmin(decoded.roles && decoded.roles.includes('admin'));
      }
    }
  }, [token]);

  // Fetch all dashboard data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      try {
        const [safetyRes, competencyRes, pendingReportsRes] = await Promise.all([
           fetch(
            `${baseUrl}/latest-by-month?year=${year}&month=${month}`,
            { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" } }
          ),
          fetch(
            `${baseUrl}/personnels/analytics`,
            { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" } }
          ),
          fetch(
            `${baseUrl}/reports/pending`,
            { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" } }
          )
        ]);
        
        if (safetyRes.status === 401 || competencyRes.status === 401 || pendingReportsRes.status === 401) {
            logout(); // Logout if token is invalid
            return;
        }

        if (safetyRes.ok) {
            const safetyData = await safetyRes.json();
            setSafetyMetrics({
              fatalities: safetyData.fatality,
              lostTime: safetyData.lost_time_injuries,
              frequency: parseFloat(safetyData.fr),
              severity: parseFloat(safetyData.sr),
              lastUpdate: safetyData.updated_at
                ? new Date(safetyData.updated_at).toLocaleDateString("id-ID")
                : "-",
            });
        } else {
            console.error("Gagal mengambil data safety metrics");
        }
        
        if(competencyRes.ok){
            const competencyData = await competencyRes.json();
            setCompetencyAnalytics(competencyData);
        } else {
            console.error("Gagal mengambil data kompetensi");
        }
        
        if (pendingReportsRes.ok) {
            const pendingData = await pendingReportsRes.json();
            setPendingReports(pendingData);
        } else {
            console.error("Gagal mengambil data laporan tertunda");
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);
  
  const quickActions = [
    {
      title: "Safety Metrics",
      description: "Lihat dan kelola data keselamatan",
      href: isAdmin ? "/qshe/safety-admin" : "/qshe/safety-metrics",
      icon: Activity,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Security Metrics",
      description: "Monitor data keamanan",
      href: isAdmin ? "/security/security-admin" : "/security/security-metrics",
      icon: Shield,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Scan Visitor",
      description: "Check-in dan check-out tamu",
      href: "/security/vms",
      icon: Users,
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Laporan",
      description: "Akses semua laporan",
      href: "/reports",
      icon: FileText,
      color: "bg-yellow-100 text-yellow-700",
    },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-white">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
             {new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
      
       {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-green-200">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Safety Status</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold text-green-600">Good</div>
                <p className="text-xs text-muted-foreground">
                   {safetyMetrics.fatalities} fatalities, {safetyMetrics.lostTime} LTI bulan ini
                </p>
             </CardContent>
          </Card>
          <Card className="border-blue-200">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Status</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold text-green-600">Secure</div>
                <p className="text-xs text-muted-foreground">
                   {securityMetrics.criminalCases} incident bulan ini
                </p>
             </CardContent>
          </Card>
           <Card className="border-yellow-200">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                <FileText className="h-4 w-4 text-yellow-600" />
             </CardHeader>
             <CardContent>
                 {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> :
                    <>
                        <div className="text-2xl font-bold text-yellow-600">
                           {pendingReports.reduce((acc, item) => acc + item.count, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                           {pendingReports.reduce((acc, item) => acc + item.urgent, 0)} butuh perhatian
                        </p>
                    </>
                 }
             </CardContent>
          </Card>
           <Card className="border-purple-200">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Personel</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
             </CardHeader>
             <CardContent>
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold text-purple-600">{competencyAnalytics?.total_personnel || 0}</div>}
                <p className="text-xs text-muted-foreground">
                   Personel Security Aktif
                </p>
             </CardContent>
          </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Akses Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="hover:shadow-lg transition-shadow duration-200 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                   <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                   </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Competency & Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
           <CardHeader>
             <CardTitle>Ringkasan Kompetensi Keahlian</CardTitle>
             <CardDescription>Distribusi sertifikasi personel untuk setiap keahlian.</CardDescription>
           </CardHeader>
           <CardContent>
            {isLoading ? <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
              <div className="space-y-4">
                {competencyAnalytics?.skills_summary.map(skill => {
                  const total = skill.certified + skill.not_certified;
                  const percentage = total > 0 ? (skill.certified / total) * 100 : 0;
                  return (
                    <div key={skill.skill_name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{skill.skill_name} <Badge variant="outline" className="ml-2">{skill.skill_category}</Badge></span>
                        <span className="text-sm text-muted-foreground">{skill.certified} / {total} Personel</span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  )
                })}
              </div>
            )}
           </CardContent>
        </Card>
        
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <span>Sertifikasi Segera Kedaluwarsa</span>
                    </CardTitle>
                    <CardDescription>Sertifikasi yang perlu segera diperbarui.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center items-center py-5"><Loader2 className="h-6 w-6 animate-spin"/></div> : (
                        <div className="space-y-3">
                            {competencyAnalytics?.expiring_soon.length > 0 ? (
                                competencyAnalytics.expiring_soon.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-2 bg-red-50 rounded-md">
                                        <div>
                                            <p className="font-semibold">{item.personnel}</p>
                                            <p className="text-xs text-muted-foreground">{item.skill}</p>
                                        </div>
                                        <Badge variant="destructive">{new Date(item.expiry).toLocaleDateString('id-ID')}</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada sertifikasi yang akan kedaluwarsa.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2">
                   <FileText className="h-5 w-5" />
                   <span>Laporan Tertunda</span>
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {isLoading ? <div className="flex justify-center items-center py-5"><Loader2 className="h-6 w-6 animate-spin"/></div> : (
                    pendingReports.length > 0 ? (
                        pendingReports.map((report) => (
                           <div
                             key={report.type}
                             className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                           >
                             <div>
                               <p className="font-medium text-sm">{report.type}</p>
                             </div>
                              <Badge variant={report.urgent > 0 ? "destructive" : "secondary"}>{report.count} pending</Badge>
                           </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Tidak ada laporan yang tertunda.</p>
                    )
                 )}
               </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
