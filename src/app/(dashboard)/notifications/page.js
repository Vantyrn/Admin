"use client";

import React, { useState } from "react";
import { 
  Bell, 
  Send, 
  Smartphone, 
  Users, 
  Info,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { sendMassNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [audience, setAudience] = useState("ALL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title) {
      toast.error("Please fill in the title");
      return;
    }

    setLoading(true);
    try {
      const result = await sendMassNotification(audience, title, message);
      if (result.success) {
        toast.success(result.message);
        // Clear form on success
        setTitle("");
        setMessage("");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-swiggy-navy dark:text-white uppercase">
          Mass Notifications
        </h1>
        <p className="text-xs sm:text-sm text-swiggy-gray dark:text-zinc-400 font-bold uppercase tracking-widest">
          Broadcast push notifications to your customers and vendors instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        {/* Form Section */}
        <div className="space-y-6">
          <Card className="rounded-2xl sm:rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-visible">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-swiggy-orange/10 flex items-center justify-center text-swiggy-orange border border-swiggy-orange/10">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black text-swiggy-navy uppercase tracking-tight">Broadcast Message</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Compose your notification details below.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Audience Selector */}
              <div className="space-y-2">
                <Label htmlFor="audience" className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">
                  Target Audience
                </Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger id="audience" className="w-full h-10 sm:h-12 rounded-xl font-bold text-sm">
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="font-bold">All Users (Customers & Vendors)</SelectItem>
                    <SelectItem value="CUSTOMERS" className="font-bold">Customers Only</SelectItem>
                    <SelectItem value="VENDORS" className="font-bold">Vendors Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium flex items-center gap-1 mt-1 italic">
                  <Info className="w-3 h-3" />
                  Message will be sent to all active devices in this group.
                </p>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">
                  Notification Title
                </Label>
                <Input 
                  id="title"
                  placeholder="e.g., Weekend Flash Sale! 🍕"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 sm:h-12 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 font-bold text-sm"
                  maxLength={50}
                />
                <div className="flex justify-end">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    title.length > 40 ? "text-swiggy-orange" : "text-zinc-400"
                  )}>
                    {title.length}/50
                  </span>
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">
                  Message Content (Optional)
                </Label>
                <Textarea 
                  id="message"
                  placeholder="e.g., Get 50% off on all orders above ₹499. Valid today only!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] sm:min-h-[120px] rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 font-bold text-sm resize-none"
                  maxLength={150}
                />
                <div className="flex justify-end">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    message.length > 130 ? "text-swiggy-orange" : "text-zinc-400"
                  )}>
                    {message.length}/150
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Irreversible Action</span>
              </div>
              <Button 
                onClick={handleSend}
                disabled={loading || !title}
                className="w-full sm:w-auto bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-8 h-10 sm:h-12 rounded-xl shadow-lg shadow-swiggy-orange/20 transition-all active:scale-95 disabled:opacity-50 text-sm uppercase tracking-widest"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="hidden sm:flex flex-col items-center justify-start pt-4 lg:pt-10 animate-in slide-in-from-right-8 duration-700">
          <div className="relative">
            {/* Device Frame - Scaled for Tablet/Small Desktop */}
            <div className="w-[260px] lg:w-[280px] h-[520px] lg:h-[580px] bg-zinc-900 rounded-[2.5rem] lg:rounded-[3rem] border-[6px] lg:border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col">
              {/* Speaker/Camera cutout */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 lg:w-28 h-5 lg:h-6 bg-zinc-800 rounded-b-2xl z-20" />
              
              {/* Screen Content (Mock Wallpaper) */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-swiggy-orange to-swiggy-navy opacity-90" />
              
              {/* Status Bar */}
              <div className="relative px-6 pt-4 pb-2 flex justify-between items-center text-[10px] text-white font-black z-10">
                <span>9:41</span>
                <div className="flex gap-1.5 items-center">
                   <div className="flex gap-0.5 items-end h-2.5">
                      <div className="w-[2px] h-1 bg-white" />
                      <div className="w-[2px] h-1.5 bg-white" />
                      <div className="w-[2px] h-2 bg-white/40" />
                      <div className="w-[2px] h-2.5 bg-white/40" />
                   </div>
                   <div className="w-4 h-2 rounded-[2px] border border-white/40 flex items-center px-[1px]">
                      <div className="w-2.5 h-1 bg-white rounded-[1px]" />
                   </div>
                </div>
              </div>

              {/* Notification Overlay */}
              <div className="flex-1 px-4 py-8 relative z-10 flex flex-col gap-4">
                <div className="w-full h-[1px] bg-white/10 my-4" />
                
                {/* Real-time Preview Card */}
                <div className={cn(
                  "w-full bg-white/20 backdrop-blur-2xl rounded-2xl p-4 border border-white/20 shadow-2xl transition-all duration-500",
                  (title || message) ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-swiggy-orange shadow-lg">
                      <span className="text-xl font-black italic -ml-0.5">V</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Vantyrn</span>
                        <span className="text-[9px] font-bold text-white/70 uppercase">now</span>
                      </div>
                      <h4 className="text-xs font-black text-white truncate max-w-[130px] mt-0.5">
                        {title || "Notification Title"}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/90 font-bold leading-relaxed line-clamp-3">
                    {message ? message : (title ? "" : "Compose your message to see how it will appear on your users' devices...")}
                  </p>
                </div>

                {/* Second Mock Notification (Generic) */}
                <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 opacity-40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-white/20 rounded-xl" />
                    <div className="flex-1">
                      <div className="w-20 h-2 bg-white/20 rounded" />
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded mb-1" />
                  <div className="w-3/4 h-2 bg-white/10 rounded" />
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full" />
            </div>

            {/* Label for Preview */}
            <div className="mt-6 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-swiggy-navy dark:text-zinc-500">
                Live Device Preview
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                  Synced with editor
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
