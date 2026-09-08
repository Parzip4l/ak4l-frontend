/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Shield,
  Activity,
  FileText,
  LogOut,
  Home,
  Bell,
  User,
  ChevronDown,
  FireExtinguisher,
} from "lucide-react";
import PropTypes from "prop-types";

// Pastikan import ini sesuai path Anda
import { useAuth } from "@/contexts/AuthContext";

// FIX 1: Tambahkan '?' pada children agar opsional
export function TopNavigation({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user, logout } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // --- LOGIC PERMISSION CHECKER ---
  const checkAccess = useCallback((requiredPermission: string | null) => {
    // 1. Jika menu public (tidak butuh permission), izinkan
    if (!requiredPermission) return true;

    // 2. Jika user belum load, tolak
    if (!user) return false;

    // 3. SUPER ADMIN BYPASS
    // Mengambil roles dan memaksa tipe ke any[]
    const userRoles = (user.roles || []) as any[];
    
    const isSuperAdmin = userRoles.some((r: any) => {
        // Handle jika role berupa object {name: '...'} atau string langsung
        const roleName = typeof r === 'string' ? r : r.name;
        
        // Cek 'super-admin' (sesuai database Anda) atau 'Super Admin'
        return roleName.toLowerCase() === 'super-admin'; 
    });

    // Jika Super Admin, IZINKAN SEMUANYA
    if (isSuperAdmin) return true;

    // 4. Cek Permission Spesifik (Untuk user biasa)
    const userPermissions = (user.permissions || []) as any[];
    
    // Mapping permission menjadi array string
    const permissionNames = userPermissions.map((p: any) => typeof p === 'string' ? p : p.name);

    return permissionNames.includes(requiredPermission);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login"); 
  };

  // Scroll Listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileMenuOpen && !target.closest('.profile-dropdown-container')) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

  // --- CONFIG MENU ---
  const navigationItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Overview dan ringkasan data",
      permission: null, 
    },
    {
      title: "QSHE",
      icon: Activity,
      description: "Quality, Safety, Health & Environment",
      submenu: [
        { title: "Safety Key Metric", href: "/qshe/safety-metrics", permission: "safety_metrics.read" },
        { title: "Safety Admin", href: "/qshe/safety-admin", permission: "safety_metrics.create" }, 
        { title: "Laporan Rikes & NAPZA", href: "/qshe/rikes-napza", permission: "medical_reports.read" },
        { title: "Laporan Medical Onsite", href: "/qshe/medical-onsite", permission: "medical_reports.read" },
      ],
    },
    {
      title: "Security",
      icon: Shield,
      description: "Sistem keamanan dan monitoring",
      submenu: [
        { title: "Security Key Metric", href: "/security/security-metrics", permission: "security_metrics.read" },
        { title: "Security Admin", href: "/security/security-admin", permission: "security_metrics.create" }, 
        { title: "Laporan BUJP", href: "/security/bujp-reports", permission: "security_metrics.read" },
        { title: "Kompetensi Personil", href: "/security/competency", permission: "security_metrics.read" },
        { title: "Scan Visitor", href: "/security/vms", permission: "visitor_requests.read" },
        { title: "Walk-in Visitor", href: "/security/visitor-walk-in", permission: "visitor_requests.read" },
        { title: "Monitoring Visitor", href: "/security/visitor-monitoring", permission: "visitor_requests.read" },
        { title: "VMS Admin", href: "/security/vms-admin", permission: "visitor_requests.approve" }, 
        { title: "Cek ePTW", href: "/security/eptw-check", permission: "security_metrics.read" },
      ],
    },
    {
      title: "APAR & Hydrant",
      icon: FireExtinguisher,
      description: "Manajemen APAR dan sistem hydrant",
      submenu: [
        { title: "Dashboard APAR", href: "/apar-hydrant/dashboard", permission: "safety_metrics.read" },
        { title: "Daftar Alat", href: "/apar-hydrant/list", permission: "safety_metrics.read" },
        { title: "Jadwal & Kedaluwarsa", href: "/apar-hydrant/schedule", permission: "safety_metrics.read" },
        { title: "Admin Alat", href: "/apar-hydrant/admin", permission: "safety_metrics.update" },
      ],
    },
    {
      title: "Laporan",
      href: "/reports",
      icon: FileText,
      description: "Semua laporan dan dokumentasi",
      permission: "reports.view_summary" 
    },
    {
      title: "User Management",
      href: "/user-management",
      icon: User,
      description: "User Management System",
      // Ini permission spesifik, TAPI akan di-bypass jika role = super-admin
      permission: "users.manage" 
    },
  ];
  
  // --- FILTERING LOGIC ---
  const filteredNavigationItems = navigationItems.map(item => {
    const hasParentAccess = checkAccess(item.permission);

    if (item.submenu) {
      const visibleSubmenu = item.submenu.filter(subItem => checkAccess(subItem.permission));
      if (visibleSubmenu.length === 0 && !item.href) return null;
      return { ...item, submenu: visibleSubmenu };
    }

    return hasParentAccess ? item : null;
  }).filter(Boolean);


  // --- SUB-COMPONENT RENDER ---
  const NavigationContent = ({ items, onLinkClick }: { items: any[], onLinkClick: () => void }) => (
    <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-2 space-y-2 lg:space-y-0">
      {items.map((item) => {
        const isParentActive =
          item.submenu?.some((subItem: any) => location.pathname.startsWith(subItem.href)) ||
          location.pathname === item.href;

        return (
          <div key={item.title} className="relative group">
            {item.submenu ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 ${
                    scrolled 
                      ? "text-gray-800 hover:bg-orange-500 hover:text-white" 
                      : "text-white hover:bg-white/10"
                  } ${
                    isParentActive
                      ? scrolled
                        ? "bg-orange-500 text-white hover:bg-orange-600" 
                        : "bg-white/20"
                      : ""
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Button>

                {/* Dropdown */}
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-500 px-3 py-2">
                      {item.description}
                    </div>
                    {item.submenu.map((subItem: any) => (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          className={`block px-3 py-2 text-sm rounded-md transition
                            ${
                              location.pathname === subItem.href
                                ? "bg-orange-500 text-white font-medium hover:bg-orange-600"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          onClick={onLinkClick}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link to={item.href}>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 ${
                    scrolled 
                      ? "text-gray-800 hover:bg-orange-500 hover:text-white" 
                      : "text-white hover:bg-white/10"
                  } ${
                    isParentActive
                      ? scrolled
                        ? "bg-orange-500 text-white hover:bg-orange-600" 
                        : "bg-white/20"
                      : ""
                  }`}
                  onClick={onLinkClick}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );

  // Loading State UI
  if (!user && location.pathname !== '/login') {
    return (
        <div className="absolute top-0 left-0 w-full h-[350px] bg-gradient-to-r from-orange-500 via-red-500 to-red-600 z-0">
            <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>Memuat data...</div>
            <main>{children}</main>
        </div>
    );
  }

  return (
    <>
      {/* BACKGROUND GRADIENT */}
      <div className="absolute top-0 left-0 w-full h-[350px] bg-gradient-to-r from-orange-500 via-red-500 to-red-600 z-0" />

      {/* NAVBAR */}
      <nav
        className={`sticky top-0 z-20 transition-colors duration-300 ${
          scrolled ? "bg-white shadow-md" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 border-b border-white/20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center">
                <img
                  src={scrolled ? "/logo-lrtj.png" : "/logo-lrtj-putih.png"}
                  alt="LRTJ Logo"
                  className="h-10 object-contain"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex">
              <NavigationContent
                items={filteredNavigationItems}
                onLinkClick={() => setMobileMenuOpen(false)}
              />
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              <button className={`${scrolled ? "text-gray-700 hover:text-gray-900" : "text-white hover:text-gray-200"}`}>
                <Bell className="h-5 w-5" />
              </button>
              
              {/* Profile Dropdown */}
              <div className="relative profile-dropdown-container">
                <Button
                  variant="ghost"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`flex items-center space-x-1 ${
                    scrolled 
                        ? "text-gray-700 hover:bg-gray-100" 
                        : "text-white hover:bg-white/10"
                  } ${profileMenuOpen ? (scrolled ? "bg-gray-100" : "bg-white/10") : ""}`}
                >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="hidden md:inline text-sm font-medium">{user?.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${profileMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
                </Button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg transition-all duration-200 z-50 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b mb-2">
                        <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                             {/* FIX: Casting ke any[] dan tampilkan badge role */}
                             {(user?.roles as any[])?.slice(0, 3).map((role: any, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {typeof role === 'string' ? role : role.name}
                                </span>
                             ))}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start space-x-2 hover:bg-red-50 text-red-600 rounded-md"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${scrolled ? "text-gray-700" : "text-white"} lg:hidden`}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  <div className="pb-4 border-b">
                    <p className="font-bold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>

                  <NavigationContent
                    items={filteredNavigationItems}
                    onLinkClick={() => setMobileMenuOpen(false)}
                  />

                  <div className="pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start space-x-2 hover:bg-red-50 text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "6rem",
          maxWidth: "1280px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        {children}
      </main>
    </>
  );
}

// FIX 2: Hapus .isRequired agar TypeScript happy
TopNavigation.propTypes = {
    children: PropTypes.node, 
};
