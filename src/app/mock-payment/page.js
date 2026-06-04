"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  CreditCard,
  Building,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function MockPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  
  const [status, setStatus] = useState("idle"); // idle, processing, success, failed, cancelled
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!orderId || !amount) {
      toast.error("Invalid payment request");
      return;
    }
  }, [orderId, amount]);

  useEffect(() => {
    let interval;
    if (status === "processing") {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleCapture("success");
            return 100;
          }
          return prev + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleCapture = async (paymentResult) => {
    try {
      const res = await fetch("/api/payments/mock/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          status: paymentResult
        })
      });

      if (res.ok) {
        if (paymentResult === "success") {
          setStatus("success");
          toast.success("Payment successful!");
        } else {
          setStatus("failed");
          toast.error("Payment failed");
        }
      } else {
        throw new Error("Failed to capture payment");
      }
    } catch (error) {
      console.error("Capture Error:", error);
      setStatus("failed");
      toast.error("An error occurred during payment processing");
    }
  };

  const startPayment = () => {
    setStatus("processing");
    setProgress(0);
  };

  const cancelPayment = () => {
    setStatus("cancelled");
    toast.warning("Payment cancelled by user");
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-swiggy-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-emerald-500 p-12 flex flex-col items-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-200">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Payment Success</h2>
            <p className="opacity-90 font-bold text-sm mt-2 uppercase tracking-widest">Transaction Completed</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-100">
                <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">Transaction ID</span>
                <span className="font-mono text-sm font-bold text-swiggy-navy uppercase">MOCK_TXN_{Date.now().toString().slice(-8)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-zinc-100">
                <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">Order ID</span>
                <span className="font-mono text-sm font-bold text-swiggy-navy uppercase">{orderId?.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">Amount Paid</span>
                <span className="text-xl font-black text-emerald-600">₹{parseFloat(amount).toLocaleString()}</span>
              </div>
            </div>
            <Button 
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
              onClick={() => router.push('/orders')}
            >
              Return to Merchant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed" || status === "cancelled") {
    return (
      <div className="min-h-screen bg-swiggy-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className={`${status === 'failed' ? 'bg-red-500' : 'bg-swiggy-gray'} p-12 flex flex-col items-center text-white`}>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
              {status === 'failed' ? <XCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Payment {status === 'failed' ? 'Failed' : 'Cancelled'}</h2>
            <p className="opacity-90 font-bold text-sm mt-2 uppercase tracking-widest">Status: {status.toUpperCase()}</p>
          </div>
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-swiggy-gray font-bold text-sm leading-relaxed">
              {status === 'failed' 
                ? "Your transaction could not be processed at this time. Please try again or use a different payment method."
                : "The payment process was interrupted. No funds have been deducted from your account."}
            </p>
            <Button 
              className="w-full h-14 bg-swiggy-navy hover:bg-swiggy-navy/90 text-white rounded-2xl font-black uppercase tracking-widest"
              onClick={() => setStatus("idle")}
            >
              Try Again
            </Button>
            <Button 
              variant="ghost"
              className="w-full h-14 text-swiggy-gray font-bold uppercase tracking-widest"
              onClick={() => router.push('/orders')}
            >
              Cancel and Return
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Sandbox Banner */}
      <div className="mb-8 flex items-center gap-3 bg-amber-100 border border-amber-200 text-amber-800 px-6 py-3 rounded-full shadow-sm animate-bounce">
        <ShieldCheck className="w-5 h-5" />
        <span className="text-xs font-black uppercase tracking-widest">Sandbox / Mock Payment Mode</span>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-swiggy-navy p-8 text-white space-y-1">
          <div className="flex justify-between items-center mb-4">
            <div className="w-10 h-10 bg-swiggy-orange rounded-xl flex items-center justify-center font-bold text-xl italic">F</div>
            <Badge variant="outline" className="text-white border-white/20 font-bold uppercase tracking-widest text-[9px] px-2">Secure Gateway</Badge>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight uppercase">Payment Summary</CardTitle>
          <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Merchant: Vantyrn MARKETPLACE</CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {status === "processing" ? (
            <div className="py-12 flex flex-col items-center space-y-6">
              <div className="relative w-24 h-24">
                <Loader2 className="w-24 h-24 text-swiggy-orange animate-spin stroke-[1.5]" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-swiggy-navy text-sm">
                  {progress}%
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-swiggy-navy tracking-tight uppercase">Processing Payment</h3>
                <p className="text-swiggy-gray font-bold text-[10px] uppercase tracking-widest mt-1">Verifying credentials with bank...</p>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-swiggy-orange transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-6 space-y-4 border border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Order ID</span>
                  <span className="text-sm font-mono font-bold text-swiggy-navy dark:text-white uppercase">{orderId?.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Total Amount</span>
                  <span className="text-2xl font-black text-swiggy-orange">₹{parseFloat(amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray px-1">Select Mock Instrument</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-swiggy-orange bg-swiggy-orange/5 cursor-pointer transition-all">
                    <div className="w-10 h-10 rounded-xl bg-swiggy-orange flex items-center justify-center text-white">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-swiggy-navy dark:text-white uppercase">Mock Wallet / Card</p>
                      <p className="text-[10px] font-bold text-swiggy-orange uppercase tracking-widest">Available Balance: ₹50,000</p>
                    </div>
                    <CheckCircle2 className="ml-auto w-6 h-6 text-swiggy-orange" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <Info className="w-4 h-4 text-swiggy-gray shrink-0" />
                <p className="text-[9px] font-bold text-swiggy-gray leading-tight">
                  This is a simulated environment. No real money will be deducted from any actual bank account or credit card.
                </p>
              </div>
            </>
          )}
        </CardContent>

        {status !== "processing" && (
          <CardFooter className="p-8 pt-0 flex flex-col gap-3">
            <Button 
              className="w-full h-14 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-swiggy-orange/20 gap-2 group"
              onClick={startPayment}
            >
              Pay Now ₹{parseFloat(amount).toLocaleString()}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 text-zinc-400 hover:text-red-500 font-bold uppercase tracking-widest text-xs"
              onClick={cancelPayment}
            >
              Cancel Transaction
            </Button>
          </CardFooter>
        )}
      </Card>

      <div className="mt-8 flex items-center gap-6 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
        <div className="flex flex-col items-center gap-1">
          <Lock className="w-4 h-4" />
          <span className="text-[8px] font-bold uppercase tracking-tighter">256-bit SSL</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Building className="w-4 h-4" />
          <span className="text-[8px] font-bold uppercase tracking-tighter">PCI-DSS Compliant</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Verified Merchant</span>
        </div>
      </div>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense>
      <MockPaymentContent />
    </Suspense>
  );
}
