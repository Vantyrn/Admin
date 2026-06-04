"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to login");
      }
      
      toast.success("Login successful!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-swiggy-light dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Decorative Background Circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-swiggy-orange/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-swiggy-navy/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20 dark:border-zinc-800">
        
        {/* Left Side: Branding/Visuals (Hidden on small screens) */}
        <div className="hidden md:flex flex-col justify-start gap-20 p-12 bg-swiggy-navy relative overflow-hidden">
          {/* Subtle patterns/glows */}
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(252,128,25,0.15),transparent)] pointer-events-none" />
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-swiggy-orange rounded-2xl flex items-center justify-center shadow-lg shadow-swiggy-orange/30">
                <span className="text-white font-black text-3xl italic">V</span>
              </div>
              <span className="text-3xl font-black tracking-tight text-white">
                Vantyrn<span className="text-swiggy-orange">.</span>
              </span>
            </Link>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-swiggy-orange/20 border border-swiggy-orange/30 text-swiggy-orange text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Secure Administrator Access
            </div>
            <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">
              Manage your <br />
              <span className="text-swiggy-orange italic text-6xl">Empire.</span>
            </h2>
            <p className="text-zinc-400 text-lg font-medium max-w-sm leading-relaxed">
              Login to access the mission control for your food delivery ecosystem.
            </p>
          </div>
        </div>
        {/* Right Side: Login Form */}
        <div className="p-8 md:p-16 flex flex-col justify-center bg-white dark:bg-zinc-900">
          <div className="md:hidden mb-12 flex justify-center">
             <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-swiggy-orange rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-2xl italic">V</span>
                </div>
                <span className="text-2xl font-black tracking-tight text-swiggy-navy dark:text-white">
                  vantyrn<span className="text-swiggy-orange">.</span>
                </span>
              </Link>
          </div>

          <div className="space-y-2 mb-10 text-center md:text-left">
            <h3 className="text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">
              Welcome Back
            </h3>
            <p className="text-swiggy-gray dark:text-zinc-500 font-medium">
              Please enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-swiggy-gray dark:text-zinc-500 ml-1">
                Admin Email
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray dark:text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@vantyrn.com" 
                  className="h-14 pl-12 bg-swiggy-light/50 dark:bg-black/20 border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-swiggy-orange focus:border-swiggy-orange transition-all font-sans"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-swiggy-gray dark:text-zinc-500">
                  Secret Password
                </Label>
                <Link href="#" className="text-[10px] font-black text-swiggy-orange uppercase tracking-widest hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-swiggy-gray dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="h-14 pl-12 bg-swiggy-light/50 dark:bg-black/20 border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-swiggy-orange focus:border-swiggy-orange transition-all font-sans"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black text-lg rounded-2xl shadow-xl shadow-swiggy-orange/20 group transition-all duration-300 mt-4"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Login
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">
              &copy; 2026 Vantyrn Delivery Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
