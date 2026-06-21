"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.user);
          setAuthenticated(true);
        } else {
          router.push("/admin-login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/admin-login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (loading) {
    return (
      <div className="min-h-screen bg-swiggy-light dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-swiggy-orange/20 border-t-swiggy-orange rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-swiggy-orange font-bold text-xl italic">V</span>
          </div>
        </div>
        <p className="text-swiggy-gray dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Authenticating Secure Session...
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen bg-swiggy-light dark:bg-black transition-colors duration-300">
      {/* Sidebar - Toggleable on mobile, fixed on desktop */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 transition-all duration-300">
        {/* Topbar - Passing toggle function */}
        <Topbar onMenuClick={toggleSidebar} admin={admin} />

        {/* Scrollable Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div 
            key={pathname}
            className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
