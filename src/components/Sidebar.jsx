"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Store, 
  Bike, 
  Users, 
  Receipt, 
  BarChart3, 
  LogOut,
  ChevronRight,
  X,
  Package,
  PackagePlus,
  Bell,
  Settings,
  Tags,
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Vendors", icon: Store, href: "/vendors" },
  { name: "Categories", icon: Tags, href: "/categories" },
  { name: "Products", icon: Package, href: "/products" },
  { name: "Customers", icon: Users, href: "/customers" },
  { name: "Orders", icon: Receipt, href: "/orders" },
  { name: "Reconciliation", icon: Banknote, href: "/payments/reconciliation" },
  { name: "Notifications", icon: Bell, href: "/notifications" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <aside className={cn(
      "w-64 h-screen fixed left-0 top-0 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
    )}>
      {/* Logo Section */}
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-swiggy-orange rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-swiggy-orange/30 group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-bold text-xl sm:text-2xl italic">V</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-swiggy-navy dark:text-white">
            Vantyrn<span className="text-swiggy-orange">.</span>
          </span>
        </Link>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-swiggy-gray hover:text-swiggy-orange transition-colors"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "sidebar-item group px-3 py-3",
                isActive && "sidebar-item-active"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors duration-200",
                isActive ? "text-white" : "text-swiggy-gray group-hover:text-white"
              )} />
              <span className="font-medium">{item.name}</span>
              {isActive && <ChevronRight className="ml-auto w-4 h-4 text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Logout Section */}
      <div className="p-4 mt-auto border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 mb-4">
          <div className="w-10 h-10 rounded-full bg-swiggy-orange/10 flex items-center justify-center text-swiggy-orange font-semibold border border-swiggy-orange/20">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-swiggy-navy dark:text-white truncate max-w-[120px]">
              Admin User
            </span>
            <span className="text-[10px] uppercase tracking-widest text-swiggy-gray font-semibold">
              Super Admin
            </span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-6"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold uppercase tracking-wider text-xs">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
