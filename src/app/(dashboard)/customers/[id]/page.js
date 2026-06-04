"use client";

import React, { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  ShoppingBag, 
  Star,
  MessageSquare,
  Clock,
  ExternalLink,
  MoreVertical,
  AlertCircle,
  Ban,
  Flag,
  UserCheck,
  UserMinus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock Data removed

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;
  
  const { data: customer, loading, mutate } = useRealtime(`/api/customers/${customerId}`);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!customer || !newStatus) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: statusReason })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Customer status updated to ${newStatus}`);
      setIsStatusModalOpen(false);
      setStatusReason("");
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black text-swiggy-navy dark:text-white tracking-tighter uppercase">{customer.fullName || "Customer"}</h1>
              <Badge className={cn(
                "font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border",
                customer.isGuest ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              )}>
                {customer.isGuest ? 'Guest User' : 'Registered'}
              </Badge>
              {(() => {
                const status = customer.status || "ACTIVE";
                const colorMap = {
                  ACTIVE: "bg-green-50 text-green-600 border-green-100",
                  SUSPENDED: "bg-red-50 text-red-600 border-red-100",
                  DISABLED: "bg-zinc-50 text-zinc-600 border-zinc-100",
                  PENDING: "bg-amber-50 text-amber-600 border-amber-100"
                };
                return (
                  <Badge className={cn(
                    "font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border",
                    colorMap[status] || colorMap.ACTIVE
                  )}>
                    {status}
                  </Badge>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
               <p className="text-[10px] sm:text-xs text-swiggy-gray font-bold uppercase tracking-widest">ID: {customer.id}</p>
               <span className="w-1 h-1 rounded-full bg-zinc-300" />
               <p className="text-[10px] sm:text-xs text-swiggy-gray font-bold uppercase tracking-widest">Joined {customer.registrationDate}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl border border-zinc-200 font-bold gap-2">
                <MoreVertical className="w-4 h-4" /> Administrative Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border border-zinc-100 bg-white">
              <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-400 px-2 py-1.5">Manage Account</DropdownMenuLabel>
              {customer.status === "SUSPENDED" || customer.status === "DISABLED" ? (
                <DropdownMenuItem 
                  className="rounded-lg gap-2 cursor-pointer font-bold text-green-600 focus:bg-green-50 focus:text-green-700"
                  onClick={() => {
                    setNewStatus("ACTIVE");
                    setIsStatusModalOpen(true);
                  }}
                >
                  <UserCheck className="w-4 h-4" /> Reactivate Account
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem 
                    className="rounded-lg gap-2 cursor-pointer font-bold text-zinc-700 focus:bg-amber-50 focus:text-amber-600"
                    onClick={() => {
                      setNewStatus("PENDING");
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <Flag className="w-4 h-4" /> Flag for Review
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="rounded-lg gap-2 cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
                    onClick={() => {
                      setNewStatus("SUSPENDED");
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <Ban className="w-4 h-4" /> Suspend Account
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="rounded-lg gap-2 cursor-pointer font-bold text-zinc-600 focus:bg-zinc-50 focus:text-zinc-700"
                    onClick={() => {
                      setNewStatus("DISABLED");
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <UserMinus className="w-4 h-4" /> Disable Account
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Verification */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="p-8 border-b border-zinc-50 flex flex-col items-center gap-4 text-center">
                <Avatar className="w-24 h-24 rounded-full border-4 border-zinc-50 shadow-md">
                  <AvatarFallback className="bg-swiggy-orange text-white text-3xl font-black">{customer.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black text-swiggy-navy uppercase tracking-tight">{customer.fullName}</CardTitle>
                  <p className="text-sm font-bold text-swiggy-gray">{customer.email}</p>
                </div>
             </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-swiggy-orange" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Phone</p>
                      <p className="text-sm font-bold text-swiggy-navy dark:text-white">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-swiggy-orange" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email</p>
                      <p className="text-sm font-bold text-swiggy-navy dark:text-white truncate">{customer.email || "No Email Provided"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden border-swiggy-orange/10 bg-swiggy-orange/[0.02]">
             <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-swiggy-orange" /> Age Verification
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 pt-0">
                <div className="flex items-center justify-between mb-4">
                   <Badge className="bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider h-7">
                     {customer.ageVerification.status}
                   </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-swiggy-navy uppercase tracking-widest">Date of Birth: <span className="text-swiggy-gray">{customer.ageVerification.birthDate}</span></p>
                  <p className="text-xs font-bold text-swiggy-navy uppercase tracking-widest">Age: <span className="text-swiggy-gray">{customer.ageVerification.age} Years</span></p>
                </div>
             </CardContent>
          </Card>
        </div>

        {/* Right Columns: Addresses, Orders, Feedback */}
        <div className="lg:col-span-2 space-y-6">
           <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-100 p-1 rounded-2xl h-12 shadow-sm w-full lg:w-fit flex overflow-x-auto no-scrollbar scrollbar-hide items-center justify-start min-w-0">
                <TabsTrigger value="orders" className="rounded-xl px-3 sm:px-6 font-black text-[9px] sm:text-xs uppercase tracking-widest h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all whitespace-nowrap">
                  Orders ({customer.orders?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="addresses" className="rounded-xl px-3 sm:px-6 font-black text-[9px] sm:text-xs uppercase tracking-widest h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all whitespace-nowrap">
                  Addresses ({customer.addresses?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="feedback" className="rounded-xl px-3 sm:px-6 font-black text-[9px] sm:text-xs uppercase tracking-widest h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all whitespace-nowrap">
                  Feedback ({customer.feedback?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="support" className="rounded-xl px-3 sm:px-6 font-black text-[9px] sm:text-xs uppercase tracking-widest h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all whitespace-nowrap">
                  Support ({customer.support?.length || 0})
                </TabsTrigger>
              </TabsList>


              <TabsContent value="orders" className="animate-in slide-in-from-bottom-2 duration-300">
                <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
                   <CardContent className="p-0">
                       <div className="divide-y divide-zinc-50">
                        {customer.orders?.length > 0 ? (
                          customer.orders.map((order) => (
                            <div key={order.id} className="p-6 hover:bg-zinc-50/50 transition-colors flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-100 shadow-sm">
                                    <ShoppingBag className="w-6 h-6 text-swiggy-navy" />
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-3">
                                      <h4 className="font-black text-swiggy-navy uppercase tracking-tight">{order.vendor}</h4>
                                      <Badge className={`${getStatusColor(order.status)} border font-bold text-[9px] uppercase tracking-widest`}>
                                        {order.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                      <p className="text-xs font-bold text-swiggy-gray">{order.id}</p>
                                      <span className="w-1 h-1 rounded-full bg-zinc-200" />
                                      <p className="text-xs font-bold text-swiggy-gray uppercase">{order.date}</p>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-6">
                                 <div className="text-right">
                                    <p className="text-lg font-black text-swiggy-navy">{order.amount}</p>
                                 </div>
                                 <Link href={`/orders/${order.id}`}>
                                   <Button variant="ghost" size="icon" className="rounded-xl border border-zinc-200">
                                     <ExternalLink className="w-4 h-4 text-swiggy-orange" />
                                   </Button>
                                 </Link>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20 bg-zinc-50/50">
                            <ShoppingBag className="w-16 h-16 text-zinc-100 mx-auto mb-4" />
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No order history found</p>
                          </div>
                        )}
                      </div>
                   </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="addresses" className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses?.length > 0 ? (
                    customer.addresses.map((address, i) => (
                      <Card key={i} className="rounded-3xl border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                           <CardTitle className="text-xs font-black text-swiggy-navy dark:text-white uppercase tracking-widest flex items-center gap-2">
                             <MapPin className="w-4 h-4 text-swiggy-orange" /> {address.type}
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                           <p className="text-sm font-bold text-swiggy-gray leading-relaxed">
                             {address.detail}
                           </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 bg-zinc-50/50 rounded-3xl border-2 border-dashed border-zinc-100">
                      <MapPin className="w-16 h-16 text-zinc-100 mx-auto mb-4" />
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No saved addresses</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  {customer.feedback?.length > 0 ? (
                    customer.feedback.map((item, i) => (
                      <Card key={i} className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-black text-swiggy-navy uppercase tracking-tight">{item.vendor}</h4>
                              <p className="text-[10px] font-bold text-zinc-400 mt-0.5 uppercase tracking-widest">{item.date}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < item.rating ? 'fill-swiggy-orange text-swiggy-orange' : 'text-zinc-200'}`} />
                              ))}
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 relative">
                            <MessageSquare className="w-4 h-4 text-zinc-200 absolute -top-2 -left-2 fill-white" />
                            <p className="text-sm font-bold text-swiggy-gray italic">"{item.comment || "No comment provided"}"</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                      <Star className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-zinc-400 uppercase">No feedback submitted yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="support" className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  {customer.support?.length > 0 ? (
                    customer.support.map((item, i) => (
                      <Card key={i} className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-swiggy-orange" />
                              </div>
                              <div>
                                <h4 className="font-black text-swiggy-navy uppercase tracking-tight">{item.type}</h4>
                                <p className="text-[10px] font-bold text-zinc-400 mt-0.5 uppercase tracking-widest">Ticket: {item.ticketId} • {item.date}</p>
                              </div>
                            </div>
                            <Badge className={cn(
                              "font-bold text-[10px] uppercase tracking-widest border px-3 h-7",
                              item.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                              item.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-zinc-50 text-zinc-500 border-zinc-100'
                            )}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                            <p className="text-sm font-bold text-swiggy-navy leading-relaxed">{item.message}</p>
                            {item.orderId && (
                              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Related Order:</span>
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest h-6 border-zinc-200">#{item.orderId}</Badge>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                      <MessageSquare className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-zinc-400 uppercase">No support requests found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
        </div>
      </div>

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl bg-white border border-zinc-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-swiggy-navy uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-swiggy-orange" /> Update Customer Status
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-zinc-500">
              Confirm status change for customer <strong>{customer.fullName}</strong>. Provide a mandatory administrative explanation below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Target Status</Label>
              <Badge className="w-fit font-black text-xs uppercase tracking-widest px-3 py-1 bg-zinc-100 text-zinc-800 rounded-full border border-zinc-200">
                {newStatus}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-reason" className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Reason for status update</Label>
              <Input
                id="status-reason"
                placeholder="Enter justification..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm outline-none px-4"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl font-bold h-11 border-zinc-200" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="rounded-xl font-bold h-11 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white shadow-lg shadow-swiggy-orange/20"
              onClick={handleStatusUpdate}
              disabled={updating || !statusReason.trim()}
            >
              {updating ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
