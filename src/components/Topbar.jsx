"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Search, User, Menu, ShoppingBag, UserPlus, Info, Check } from "lucide-react";
import { useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const routeTitles = {
  "/dashboard": "Dashboard Overview",
  "/vendors": "Vendor Management",
  "/customers": "Customer Base",
  "/orders": "Order History",
  "/reports": "Business Insights",
};

const getIconForType = (type) => {
  switch (type) {
    case 'ORDER': return ShoppingBag;
    case 'KYC': return UserPlus;
    case 'SYSTEM': return Info;
    case 'CUSTOMER': return User;
    default: return Info;
  }
};

const getColorForType = (type) => {
  switch (type) {
    case 'ORDER': return "text-blue-500 bg-blue-50";
    case 'KYC': return "text-swiggy-orange bg-orange-50";
    case 'SYSTEM': return "text-zinc-500 bg-zinc-50";
    case 'CUSTOMER': return "text-emerald-500 bg-emerald-50";
    default: return "text-zinc-500 bg-zinc-50";
  }
};

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = routeTitles[pathname] || "Admin Panel";

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Signed out successfully");
        router.push("/admin-login");
        router.refresh();
      } else {
        toast.error("Failed to sign out");
      }
    } catch (error) {
      toast.error("An error occurred during sign out");
    }
  };
  
  const { data, loading, mutate } = useRealtime("/api/notifications", {
    interval: 1000,
    toastConfig: {
      new: (n) => n.title,
      description: (n) => n.description
    }
  });
  
  const notifications = data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        toast.success("All notifications marked as read");
        mutate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        toast.success("All notifications cleared");
        mutate();
      } else {
        toast.error("Failed to clear notifications");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while clearing notifications");
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 px-3 sm:px-6 md:px-8 flex items-center justify-between">
      {/* Mobile Menu Icon */}
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-2 mr-1 sm:mr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
      >
        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-swiggy-navy dark:text-zinc-400" />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0 mr-2">
        <h1 className="text-lg sm:text-2xl font-bold text-swiggy-navy dark:text-white tracking-tight truncate">
          {pageTitle}
        </h1>
        <p className="text-[8px] sm:text-xs font-semibold text-swiggy-gray uppercase tracking-widest mt-0.5 sm:mt-1 truncate">
          Welcome back, Admin
        </p>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        {/* Live Status Badge */}
        <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-sm shadow-emerald-100/50">
          <div className="relative">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest whitespace-nowrap">Live Connected</span>
        </div>

        {/* Search Bar (Premium addition) */}
        <div className="hidden md:flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-xl border border-transparent focus-within:border-swiggy-orange/50 transition-all duration-200">
          <Search className="w-4 h-4 text-swiggy-gray" />
          <input 
            type="text" 
            placeholder="Search everything..." 
            className="bg-transparent border-none outline-none text-sm text-swiggy-navy dark:text-white placeholder:text-swiggy-gray w-64"
          />
        </div>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none relative p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group">
            <Bell className="w-6 h-6 text-swiggy-navy dark:text-zinc-400 group-hover:text-swiggy-orange transition-colors" />
            {unreadCount > 0 && (
              <Badge className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center p-0 bg-swiggy-orange border-2 border-white dark:border-zinc-950 font-bold text-[9px] animate-bounce">
                {unreadCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] md:w-[380px] mt-2 p-0 rounded-2xl shadow-2xl border-zinc-100 overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <DropdownMenuLabel className="font-bold text-swiggy-navy p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-[10px] font-bold text-swiggy-orange uppercase tracking-wider hover:opacity-70 transition-opacity"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={cn(
                      "p-4 flex gap-4 cursor-pointer focus:bg-zinc-50 border-b border-zinc-50 transition-colors",
                      !n.isRead && "bg-swiggy-orange/[0.02]"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", getColorForType(n.type))}>
                      {(() => {
                        const Icon = getIconForType(n.type);
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-xs font-bold uppercase tracking-tight", n.isRead ? "text-zinc-400" : "text-swiggy-navy")}>
                          {n.title}
                        </p>
                        <p className="text-[10px] font-semibold text-zinc-400 whitespace-nowrap ml-2">{n.time}</p>
                      </div>
                      <p className="text-xs font-medium text-swiggy-gray line-clamp-2 leading-relaxed">
                        {n.description}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-swiggy-orange flex-shrink-0 mt-2" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-12 text-center">
                   <Bell className="w-12 h-12 text-zinc-100 mx-auto mb-3" />
                   <p className="text-sm font-semibold text-zinc-400 italic">No new notifications</p>
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 bg-zinc-50 border-t border-zinc-100">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="w-full py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2 sm:gap-3 p-0.5 sm:p-1 sm:pr-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
              <Avatar className="h-8 w-8 sm:h-10 sm:h-10 border-2 border-swiggy-orange/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-swiggy-orange/10 text-swiggy-orange font-semibold text-xs sm:text-sm">SY</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-swiggy-navy dark:text-white leading-none">Syed W.</p>
                <p className="text-[10px] font-semibold text-swiggy-gray uppercase tracking-widest mt-1">Admin</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-xl">
            <DropdownMenuLabel className="font-bold">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-medium">
              <User className="w-4 h-4" /> Profile Details
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="rounded-lg gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
