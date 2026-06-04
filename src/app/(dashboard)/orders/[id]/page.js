"use client";

import React, { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Store, 
  Bike, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  Receipt,
  Phone,
  ArrowRight,
  ExternalLink,
  MapPin,
  AlertTriangle,
  Loader2,
  Ban,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// Mock Data removed

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '1rem' };
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

function LiveTrackingMap({ tracking }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });
  
  const mapCenter = tracking?.rider || tracking?.vendor || tracking?.customer || defaultCenter;

  return isLoaded ? (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={14}
      >
        {tracking?.vendor && <Marker position={tracking.vendor} title="Vendor" icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png" />}
        {tracking?.customer && <Marker position={tracking.customer} title="Customer" icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" />}
        {tracking?.rider && <Marker position={tracking.rider} title="Rider" icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}
      </GoogleMap>
  ) : <Skeleton className="w-full h-[400px] rounded-2xl" />
}

const STATUS_CONFIG = {
  PAYMENT_SUCCESSFUL: { label: "Pending Vendor", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Accepted", color: "bg-sky-100 text-sky-700 border-sky-200" },
  PREPARING: { label: "Preparing", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  READY: { label: "Ready for Pickup", color: "bg-purple-100 text-purple-700 border-purple-200" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700 border-orange-200" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  REFUNDED: { label: "Refunded", color: "bg-gray-100 text-gray-700 border-gray-200" },
  FLAGGED: { label: "Flagged", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  
  const { data: order, loading } = useRealtime(`/api/orders/${orderId}`);
  const { data: tracking } = useRealtime(`/api/orders/${orderId}/tracking`, { interval: 5000 });

  // Modal states
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCancelOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, notes: "Cancelled via Admin Panel" })
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      toast.success("Order cancelled successfully");
      setIsCancelModalOpen(false);
      setIsExceptionModalOpen(false);
      setCancelReason("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerRefund = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId, amount: refundAmount, notes: "Triggered via Admin Panel" })
      });
      if (!res.ok) throw new Error("Failed to trigger refund");
      toast.success("Refund processed successfully");
      setIsRefundModalOpen(false);
      setIsExceptionModalOpen(false);
      setRefundAmount("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl border border-zinc-200 shadow-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">{order.id}</h1>
              {(() => {
                const config = STATUS_CONFIG[order.status] || { label: order.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                return (
                  <Badge className={`${config.color} font-black text-[10px] uppercase tracking-widest px-3 py-1`}>
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-sm text-swiggy-gray font-medium mt-1 inline-flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Ordered on {order.createdAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {order.isFlagged && (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 px-4 py-2 font-black rounded-xl">
                <AlertTriangle className="w-4 h-4 mr-2" /> FLAG DETECTED
              </Badge>
           )}
           <Button 
             className="bg-swiggy-navy hover:bg-swiggy-navy/90 text-white font-black px-6 rounded-xl h-12 shadow-lg"
             onClick={() => setIsExceptionModalOpen(true)}
           >
             Manage Exception
           </Button>
        </div>
      </div>

      {order.isFlagged && (
        <Card className="rounded-2xl border-amber-100 bg-amber-50 shadow-sm overflow-hidden">
          <CardHeader className="p-6 pb-0">
             <CardTitle className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
               <AlertTriangle className="w-4 h-4" /> System Alert
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <p className="text-sm font-bold text-amber-900 leading-relaxed">
               {order.flagReason}
             </p>
          </CardContent>
        </Card>
      )}

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {[
           { type: "Customer", data: order.customer, icon: User, href: `/customers/${order.customer.id}` },
           { type: "Vendor", data: order.vendor, icon: Store, href: `/vendors/${order.vendor.id}` },
         ].map((contact, i) => (
           <Card key={i} className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden group">
              <CardHeader className="p-6 border-b border-zinc-50 bg-zinc-50/50 flex flex-row items-center justify-between">
                 <CardTitle className="text-xs font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
                   <contact.icon className="w-4 h-4 text-swiggy-orange" /> {contact.type}
                 </CardTitle>
                 {contact.href && (
                   <Link href={contact.href}>
                     <ExternalLink className="w-4 h-4 text-zinc-300 group-hover:text-swiggy-orange transition-colors" />
                   </Link>
                 )}
              </CardHeader>
              <CardContent className="p-6">
                 {contact.data ? (
                   <div className="space-y-4">
                      <div>
                        <p className="text-lg font-black text-swiggy-navy uppercase tracking-tight">{contact.data.name}</p>
                        <p className="text-xs font-black text-swiggy-gray mt-0.5 tracking-widest">{contact.data.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                           <Phone className="w-3.5 h-3.5" />
                         </div>
                         <span className="text-sm font-bold text-swiggy-navy">{contact.data.phone}</span>
                      </div>
                      {contact.data.address && (
                        <div className="flex items-start gap-2">
                           <MapPin className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-0.5" />
                           <p className="text-xs font-medium text-swiggy-gray leading-relaxed dark:text-zinc-500">{contact.data.address}</p>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-4 text-zinc-400 italic font-medium gap-2">
                      <Clock className="w-8 h-8 opacity-20" />
                      Pending Assignment
                   </div>
                 )}
              </CardContent>
           </Card>
         ))}
      </div>

      {/* Live Tracking */}
      <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-zinc-50 bg-zinc-50/50">
           <CardTitle className="text-xs font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
             <MapPin className="w-4 h-4 text-swiggy-orange" /> Live Tracking
           </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
           <LiveTrackingMap tracking={tracking} />
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Order Items */}
         <Card className="lg:col-span-2 rounded-3xl border-zinc-100 shadow-sm overflow-hidden h-fit">
            <CardHeader className="p-8 border-b border-zinc-50">
               <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2 uppercase tracking-tight">
                 <ShoppingBag className="w-5 h-5 text-swiggy-orange" /> Order Items ({order.items.length})
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                  <TableHeader className="bg-zinc-50">
                     <TableRow>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 px-8">Item Description</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 text-center">Qty</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 px-8 text-right">Price</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {order.items.map((item, i) => (
                       <TableRow key={i} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="py-6 px-8">
                             <p className="font-black text-swiggy-navy uppercase tracking-tight">{item.name}</p>
                             {item.addOns && (
                               <p className="text-[10px] font-bold text-swiggy-orange uppercase tracking-widest mt-1">
                                 {item.addOns}
                               </p>
                             )}
                          </TableCell>
                          <TableCell className="py-6 text-center font-bold font-mono">x{item.quantity}</TableCell>
                          <TableCell className="py-6 px-8 text-right">
                             <p className="font-black text-swiggy-navy">{item.total}</p>
                             <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{item.unitPrice} ea.</p>
                          </TableCell>
                       </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* Financials & Payment */}
         <div className="space-y-6">
            <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
               <CardHeader className="p-8 border-b border-zinc-50">
                  <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2 uppercase tracking-tight">
                    <Receipt className="w-5 h-5 text-swiggy-orange" /> Bill Summary
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-4">
                  <div className="flex justify-between text-sm font-bold text-swiggy-gray">
                     <span>Item Subtotal</span>
                     <span>{order.financials.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-swiggy-gray">
                     <span>Delivery Fee</span>
                     <span>{order.financials.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-500">
                     <span>Discount Applied</span>
                     <span>{order.financials.discount}</span>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                     <span className="text-lg font-black text-swiggy-navy">Order Total</span>
                     <span className="text-2xl font-black text-swiggy-navy">{order.financials.netTotal}</span>
                  </div>
                  <div className="mt-6 p-4 rounded-2xl bg-swiggy-navy text-white flex justify-between items-center shadow-lg shadow-swiggy-navy/20">
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Commission Earned</p>
                       <p className="text-lg font-black text-swiggy-orange">{order.financials.platformCommission}</p>
                     </div>
                     <ArrowRight className="w-5 h-5 text-white/20" />
                  </div>
               </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
               <CardHeader className="p-8 border-b border-zinc-50">
                  <CardTitle className="text-sm font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-swiggy-orange" /> Payment Info
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Method</p>
                    <p className="text-sm font-bold text-swiggy-navy">{order.payment.method}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Transaction ID</p>
                    <p className="text-sm font-bold text-swiggy-navy font-mono">{order.payment.transactionId}</p>
                  </div>
                  <div className="flex items-center justify-between">
                     <Badge className="bg-swiggy-navy text-white font-black text-[10px] uppercase tracking-widest px-3 py-1">
                       {order.payment.status}
                     </Badge>
                     {order.payment.verified && (
                       <div className="flex items-center gap-1.5 text-emerald-600">
                         <CheckCircle2 className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                       </div>
                     )}
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>

      {/* Exception Modals */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-swiggy-navy">Manage Exception</DialogTitle>
            <DialogDescription className="font-medium text-swiggy-gray">
              Choose an action to handle the exception for order {order?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <Button 
              variant="outline" 
              className="h-16 justify-start px-6 rounded-2xl border-zinc-200 hover:border-red-500 hover:bg-red-50 group"
              onClick={() => {
                setIsExceptionModalOpen(false);
                setIsCancelModalOpen(true);
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Ban className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-zinc-900 group-hover:text-red-700">Cancel Order</p>
                <p className="text-xs font-medium text-zinc-500">Stop order progression and notify parties</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 justify-start px-6 rounded-2xl border-zinc-200 hover:border-blue-500 hover:bg-blue-50 group"
              onClick={() => {
                setIsExceptionModalOpen(false);
                setIsRefundModalOpen(true);
                // Pre-fill amount
                if (order?.financials?.netTotal) {
                  setRefundAmount(order.financials.netTotal.replace(/[^0-9.]/g, ''));
                }
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Undo2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-zinc-900 group-hover:text-blue-700">Trigger Refund</p>
                <p className="text-xs font-medium text-zinc-500">Initiate refund to customer payment method</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
              <Ban className="w-5 h-5" /> Cancel Order
            </DialogTitle>
            <DialogDescription className="font-medium text-swiggy-gray">
              Please provide a reason for cancelling this order. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-xs font-black uppercase tracking-widest text-swiggy-gray">Cancellation Reason</Label>
            <Input 
              className="mt-2 h-12 rounded-xl border-zinc-200"
              placeholder="e.g. Vendor unresponsive"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)}>Back</Button>
            <Button 
              variant="destructive" 
              className="font-black rounded-xl h-10 px-6"
              onClick={handleCancelOrder}
              disabled={submitting || !cancelReason.trim()}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Refund Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-blue-600 flex items-center gap-2">
              <Undo2 className="w-5 h-5" /> Trigger Refund
            </DialogTitle>
            <DialogDescription className="font-medium text-swiggy-gray">
              Initiate a refund for order {order?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-widest text-swiggy-gray">Refund Amount (₹)</Label>
              <Input 
                type="number"
                className="mt-2 h-12 rounded-xl border-zinc-200 font-bold"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
              <p className="text-[10px] font-medium text-zinc-400 mt-1">Max available: {order?.financials?.netTotal}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRefundModalOpen(false)}>Back</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-10 px-6"
              onClick={handleTriggerRefund}
              disabled={submitting || !refundAmount}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
