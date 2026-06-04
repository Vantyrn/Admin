"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Bike, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Background Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-swiggy-orange/5 rounded-full blur-[120px] -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-swiggy-navy/5 rounded-full blur-[120px] -ml-32 -mb-32" />

      {/* Header / Logo Only */}
      <header className="px-8 h-24 flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-swiggy-orange rounded-xl flex items-center justify-center shadow-lg shadow-swiggy-orange/30">
            <span className="text-white font-bold text-2xl italic">V</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-swiggy-navy dark:text-white">
            Vantyrn<span className="text-swiggy-orange">.</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin-login">
            <Button variant="ghost" className="font-semibold text-swiggy-navy dark:text-white uppercase tracking-wider text-xs">
              Portal Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center">
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Badge className="bg-swiggy-orange/10 text-swiggy-orange border-swiggy-orange/20 px-4 py-1.5 font-bold uppercase tracking-widest text-[10px] mb-4">
            Admin Portal
          </Badge>
          
          <h1 className="text-6xl md:text-8xl font-bold text-swiggy-navy dark:text-white leading-[1.1] tracking-tighter">
            Control the <span className="text-swiggy-orange italic">Future</span> of Fresh Deliveries.
          </h1>
          
          <p className="text-xl text-swiggy-gray dark:text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Manage your entire food delivery ecosystem with precision. From real-time order tracking to vendor performance analytics, all in one premium dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <Link href="/admin-login">
              <Button className="h-16 px-10 rounded-2xl bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-bold text-lg shadow-2xl shadow-swiggy-orange/30 group transition-all duration-300">
                Get Started
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Icons Section */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12 animate-in fade-in duration-1000 delay-500">
          {[
            { label: "Orders", icon: ShoppingBag, color: "text-blue-500" },
            { label: "Vendors", icon: LayoutDashboard, color: "text-emerald-500" },
            { label: "Customers", icon: Users, color: "text-purple-500" },
            { label: "Analytics", icon: Users, color: "text-swiggy-orange" }
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-3 group px-4">
              <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm group-hover:shadow-xl transition-all duration-300 border border-zinc-100 dark:border-zinc-800 ${item.color}`}>
                <item.icon className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-swiggy-gray dark:text-zinc-500">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-8 text-center text-swiggy-gray dark:text-zinc-600 font-semibold text-xs uppercase tracking-[0.2em] relative z-10">
        &copy; 2026 Vantyrn Delivery Solutions. Built for scale.
      </footer>
    </div>
  );
}
