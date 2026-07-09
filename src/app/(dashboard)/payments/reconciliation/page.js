"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Banknote,
  Info,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";

// Human-readable "2m ago" style age from a timestamp.
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function ReconciliationPage() {
  const { data, loading, mutate } = useRealtime("/api/payments/upi", {
    interval: 10000,
  });
  const requests = useMemo(() => data?.requests || [], [data]);

  // Confirm dialog state
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmUtr, setConfirmUtr] = useState("");
  const [confirmAmount, setConfirmAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const confirming = requests.filter((r) => r.status === "CONFIRMING").length;
    const disputed = requests.filter((r) => r.status === "DISPUTED").length;
    const totalAmount = requests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    return { pending, confirming, disputed, totalAmount, count: requests.length };
  }, [requests]);

  const openConfirm = (req) => {
    setConfirmTarget(req);
    setConfirmUtr(req.claimed_utr || "");
    setConfirmAmount(req.amount != null ? String(req.amount) : "");
  };

  const openReject = (req) => {
    setRejectTarget(req);
    setRejectReason("");
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    // UTR is recommended (it's the proof of the matched credit) but not mandatory:
    // on iOS / without the native intent module no UTR is captured, so the admin may
    // confirm on an amount + time match alone.
    setIsConfirming(true);
    try {
      const res = await fetch("/api/payments/upi/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tr: confirmTarget.tr,
          utr: confirmUtr.trim(),
          amount: confirmAmount ? Number(confirmAmount) : undefined,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Payment confirmed — order created", {
          description: result.orderId ? `Order ${result.orderId}` : undefined,
        });
        setConfirmTarget(null);
        mutate();
      } else {
        throw new Error(result.error || "Failed to confirm payment");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("Please provide a reason");
    setIsRejecting(true);
    try {
      const res = await fetch("/api/payments/upi/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tr: rejectTarget.tr,
          reason: rejectReason.trim(),
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Payment rejected");
        setRejectTarget(null);
        mutate();
      } else {
        throw new Error(result.error || "Failed to reject payment");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "DISPUTED":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 mr-1" /> Disputed
          </Badge>
        );
      case "CONFIRMING":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5 rounded-full">
            <RefreshCcw className="w-3 h-3 mr-1" /> Confirming
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight italic uppercase">
              UPI Reconciliation
            </h1>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-2 sm:px-3">
              Manual Match
            </Badge>
          </div>
          <p className="text-swiggy-gray font-bold text-xs uppercase tracking-widest mt-1">
            Confirm or reject pending UPI deep-link payments
          </p>
        </div>
      </div>

      {/* Banner */}
      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[11px] sm:text-sm font-bold text-blue-900 leading-relaxed">
          Match the customer&apos;s UTR against the credit in the Vantryn bank/UPI account, then Confirm.
          This creates the order and notifies the vendor.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-50", desc: "Awaiting match" },
          { label: "Confirming", value: stats.confirming, icon: RefreshCcw, color: "text-blue-500", bg: "bg-blue-50", desc: "In progress" },
          { label: "Disputed", value: stats.disputed, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", desc: "Needs attention" },
          { label: "Queue Value", value: `₹${stats.totalAmount.toLocaleString()}`, icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-50", desc: "Total unsettled" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", stat.color)} />
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-black text-swiggy-gray uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-black text-swiggy-navy dark:text-white mt-1 group-hover:scale-105 transition-transform">{stat.value}</p>
                </div>
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-tighter italic">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requests Table */}
      <Card className="border-none shadow-xl overflow-hidden rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-swiggy-navy dark:text-white uppercase tracking-tight">Pending UPI Requests</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">Live queue · auto-refreshing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="responsive-table-container">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest pl-8 py-5">Reference</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Vendor</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Customer</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Claimed UTR</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">App</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Age</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="pl-8"><div className="h-4 w-32 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-zinc-100 rounded-full" /></TableCell>
                        <TableCell><div className="h-4 w-12 bg-zinc-100 rounded" /></TableCell>
                        <TableCell className="text-right pr-8"><div className="h-8 w-24 bg-zinc-100 rounded-lg ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                          <ShieldCheck className="w-16 h-16" />
                          <p className="text-lg font-black uppercase tracking-tighter">Nothing To Reconcile</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => (
                      <TableRow
                        key={req.id}
                        className={cn(
                          "group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-zinc-50 dark:border-zinc-800",
                          req.status === "DISPUTED" && "bg-red-50/40 dark:bg-red-950/10"
                        )}
                      >
                        <TableCell className="pl-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-swiggy-navy dark:text-white uppercase truncate max-w-[150px]">{req.tr?.slice(0, 16) || "N/A"}</span>
                            <span className="text-[9px] font-bold text-zinc-400 mt-0.5 uppercase tracking-tighter">Transaction Ref</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-black text-emerald-600">
                            ₹{Math.abs(Number(req.amount || 0)).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black text-swiggy-navy dark:text-white">{req.vendor_name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-swiggy-navy dark:text-white">{req.customer_name || "Guest"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-[11px] font-bold text-swiggy-navy dark:text-white">{req.claimed_utr || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold text-swiggy-gray uppercase tracking-tighter">{req.upi_app || "—"}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-[10px] font-bold text-swiggy-gray uppercase tracking-tighter">{timeAgo(req.created_at)}</TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] h-9 gap-1.5"
                              onClick={() => openConfirm(req)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-black uppercase tracking-widest text-[10px] h-9 gap-1.5"
                              onClick={() => openReject(req)}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Modal */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="rounded-2xl sm:rounded-[2rem] sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-emerald-500 p-6 sm:p-8 text-white">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Confirm Payment</DialogTitle>
              <DialogDescription className="text-white/80 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">
                Creates the order and notifies the vendor
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            {confirmTarget && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-swiggy-gray">Transaction Ref</p>
                <p className="font-mono text-xs font-bold text-swiggy-navy dark:text-white break-all mt-1">{confirmTarget.tr}</p>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">UTR (Bank Reference)</label>
              <Input
                placeholder="Enter the matched UTR..."
                className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-zinc-200 font-bold text-sm font-mono"
                value={confirmUtr}
                onChange={(e) => setConfirmUtr(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Expected Amount (₹)</label>
              {/* Read-only: the order is always created for the amount the customer was
                  charged. Editing it here only risks a mismatch — confirm against the
                  bank credit for THIS amount, or Reject if it differs. */}
              <Input
                type="number"
                readOnly
                disabled
                className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-zinc-200 bg-zinc-100 dark:bg-zinc-800 font-bold text-sm cursor-not-allowed"
                value={confirmAmount}
              />
              <p className="text-[10px] text-swiggy-gray">Verify the bank credit matches ₹{confirmAmount || "—"}. If it doesn’t, Reject instead.</p>
            </div>
            <Button
              className="w-full h-12 sm:h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 text-xs sm:text-sm"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? "Confirming..." : "Confirm & Create Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="rounded-2xl sm:rounded-[2rem] sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-swiggy-navy p-6 sm:p-8 text-white">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Reject Payment</DialogTitle>
              <DialogDescription className="text-white/60 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">
                No order will be created
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            {rejectTarget && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-swiggy-gray">Transaction Ref</p>
                <p className="font-mono text-xs font-bold text-swiggy-navy dark:text-white break-all mt-1">{rejectTarget.tr}</p>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Reason</label>
              <Textarea
                placeholder="Why is this payment being rejected?"
                className="min-h-24 rounded-xl sm:rounded-2xl border-zinc-200 font-medium text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <Button
              className="w-full h-12 sm:h-14 bg-swiggy-navy hover:bg-swiggy-navy/90 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-zinc-200 text-xs sm:text-sm"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? "Rejecting..." : "Reject Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
