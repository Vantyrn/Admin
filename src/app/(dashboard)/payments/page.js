"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw, 
  Search, 
  Filter,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Landmark,
  ShieldCheck,
  Info
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
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    adminProfit: 0,
    transactionCount: 0
  });

  // Payout Dialog State
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendors, setVendors] = useState([]);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Refund Dialog State
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  useEffect(() => {
    fetchData();
    fetchVendors();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnsRes, statsRes] = await Promise.all([
        fetch("/api/payments/transactions?limit=100"),
        fetch("/api/payments/stats")
      ]);
      
      if (txnsRes.ok) {
        const txnsData = await txnsRes.json();
        setTransactions(txnsData.transactions || []);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      toast.error("Failed to sync financial data");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    }
  };

  const handlePayout = async () => {
    if (!selectedVendor) return toast.error("Please select a vendor");
    setIsProcessingPayout(true);
    try {
      const res = await fetch("/api/payments/mock/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: selectedVendor })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.batchId) {
          toast.success(`Payout of ₹${data.totalAmount.toLocaleString()} processed for ${data.ordersProcessed} orders`);
          setIsPayoutOpen(false);
          fetchData();
        } else {
          toast.info(data.message || "No pending payouts for this vendor");
        }
      } else {
        throw new Error(data.error || "Payout failed");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder || !refundAmount) return toast.error("Please fill all fields");
    setIsProcessingRefund(true);
    try {
      // For mock purposes, we need an adminUserId. 
      // In a real app, this would come from the session.
      const res = await fetch("/api/payments/mock/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: selectedOrder, 
          amount: refundAmount,
          adminUserId: "b59a9332-9c9c-4e8c-850c-7b44566373b9" // Hardcoded for sandbox demo
        })
      });
      if (res.ok) {
        toast.success("Refund processed successfully");
        setIsRefundOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Refund failed");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESSFUL':
      case 'SUCCESS':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'PENDING':
      case 'INITIATED':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5 rounded-full"><RefreshCcw className="w-3 h-3 mr-1" /> Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGatewayIcon = (gateway) => {
    if (gateway === "VENDOR_PAYOUT") return <Wallet className="w-3 h-3 mr-1" />;
    if (gateway === "REFUND") return <RefreshCcw className="w-3 h-3 mr-1" />;
    return <CreditCard className="w-3 h-3 mr-1" />;
  };

  const filteredTxns = transactions.filter(t => 
    t.txn_id?.toLowerCase().includes(search.toLowerCase()) ||
    t.order_id?.toLowerCase().includes(search.toLowerCase()) ||
    t.gateway?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight italic uppercase">Marketplace Financials</h1>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-2 sm:px-3">Sandbox Mode</Badge>
          </div>
          <p className="text-swiggy-gray font-bold text-xs uppercase tracking-widest mt-1">Real-time revenue, commissions and vendor settlements</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none rounded-lg sm:rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 font-bold h-10 sm:h-12 text-xs sm:text-sm"
            onClick={() => setIsRefundOpen(true)}
          >
            <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">Issue Refund</span>
            <span className="xs:hidden">Refund</span>
          </Button>
          <Button 
            className="flex-1 sm:flex-none bg-swiggy-orange hover:bg-swiggy-orange/90 text-white rounded-lg sm:rounded-xl shadow-lg shadow-swiggy-orange/20 gap-2 font-black uppercase tracking-widest h-10 sm:h-12 text-xs sm:text-sm"
            onClick={() => setIsPayoutOpen(true)}
          >
            <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
            <span className="hidden xs:inline">Run Payouts</span>
            <span className="xs:hidden">Payouts</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Gross Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-50", desc: "Total customer payments" },
          { label: "Admin Profits", value: `₹${stats.adminProfit.toLocaleString()}`, icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50", desc: "Retained commissions" },
          { label: "Pending Payouts", value: `₹${stats.pendingPayouts.toLocaleString()}`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50", desc: "Unsettled vendor net" },
          { label: "Settled Funds", value: `₹${stats.completedPayouts.toLocaleString()}`, icon: ArrowDownLeft, color: "text-purple-500", bg: "bg-purple-50", desc: "Total vendor transfers" }
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

      {/* Transactions Table */}
      <Card className="border-none shadow-xl overflow-hidden rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-black text-swiggy-navy dark:text-white uppercase tracking-tight">Transaction Ledger</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">Complete financial audit log</CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-swiggy-gray" />
                <Input 
                  placeholder="Filter transactions..." 
                  className="pl-10 h-10 sm:h-12 rounded-lg sm:rounded-xl border-zinc-200 focus:border-swiggy-orange/50 transition-all text-sm font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl border-zinc-200 shrink-0">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="responsive-table-container">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest pl-8 py-5">Txn Reference</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Type / Gateway</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Customer / Order</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Timestamp</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-swiggy-navy dark:text-white text-[10px] uppercase tracking-widest">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="pl-8"><div className="h-4 w-32 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-zinc-100 rounded" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-zinc-100 rounded-full" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-zinc-100 rounded" /></TableCell>
                        <TableCell className="text-right pr-8"><div className="h-8 w-8 bg-zinc-100 rounded-lg ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTxns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                          <CreditCard className="w-16 h-16" />
                          <p className="text-lg font-black uppercase tracking-tighter">No Financial Logs Found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTxns.map((txn) => (
                      <TableRow key={txn.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-zinc-50 dark:border-zinc-800">
                        <TableCell className="pl-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-black text-swiggy-navy dark:text-white uppercase truncate max-w-[150px]">{txn.txn_id || "N/A"}</span>
                            <span className="text-[9px] font-bold text-zinc-400 mt-0.5 uppercase tracking-tighter">Reference ID</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none font-bold text-[9px] px-2 py-0.5 uppercase tracking-tighter">
                            {getGatewayIcon(txn.gateway)}
                            {txn.gateway.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-swiggy-navy dark:text-white">{txn.orders?.customers?.full_name || "Merchant Payout"}</span>
                            <span className="text-[10px] font-bold text-swiggy-gray uppercase tracking-tighter">{txn.order_id.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-sm font-black",
                            Number(txn.amount) < 0 ? "text-red-500" : (txn.gateway === "VENDOR_PAYOUT" ? "text-blue-500" : "text-emerald-600")
                          )}>
                            {Number(txn.amount) < 0 ? "-" : (txn.gateway === "VENDOR_PAYOUT" ? "out " : "in ")}
                            ₹{Math.abs(Number(txn.amount)).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(txn.status)}</TableCell>
                        <TableCell className="text-[10px] font-bold text-swiggy-gray uppercase tracking-tighter">
                          {new Date(txn.created_at).toLocaleDateString()}
                          <span className="block opacity-50 font-medium">{new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-swiggy-orange">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
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

      {/* Payout Modal */}
      <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
        <DialogContent className="rounded-2xl sm:rounded-[2rem] sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-swiggy-orange p-6 sm:p-8 text-white">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight">Vendor Settlement</DialogTitle>
            <DialogDescription className="text-white/80 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">
              Process batch payout for unpaid orders
            </DialogDescription>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Select Vendor</label>
              <Select onValueChange={setSelectedVendor} value={selectedVendor}>
                <SelectTrigger className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-zinc-200 font-bold text-sm">
                  <SelectValue placeholder="Choose a vendor..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl sm:rounded-2xl">
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="font-bold py-3">{v.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-bold text-blue-900 leading-relaxed">
                Processes all unpaid earnings for this vendor and simulates a bank transfer.
              </p>
            </div>

            <Button 
              className="w-full h-12 sm:h-14 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-swiggy-orange/20 text-xs sm:text-sm"
              onClick={handlePayout}
              disabled={isProcessingPayout}
            >
              {isProcessingPayout ? "Processing..." : "Process Payout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
        <DialogContent className="rounded-2xl sm:rounded-[2rem] sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-swiggy-navy p-6 sm:p-8 text-white">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4">
              <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight">Initiate Refund</DialogTitle>
            <DialogDescription className="text-white/60 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">
              Reverse customer payment
            </DialogDescription>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Order ID</label>
                <Input 
                  placeholder="Order ID..." 
                  className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-zinc-200 font-bold text-sm"
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Refund Amount (₹)</label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-zinc-200 font-bold text-sm"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 sm:h-14 bg-swiggy-navy hover:bg-swiggy-navy/90 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-zinc-200 text-xs sm:text-sm"
              onClick={handleRefund}
              disabled={isProcessingRefund}
            >
              {isProcessingRefund ? "Processing..." : "Authorize Refund"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
