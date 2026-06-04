"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CommissionManagement({ vendor, vendorId }) {
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [tempModel, setTempModel] = useState("");
  const [tempRate, setTempRate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (vendor) {
      setTempModel(vendor.commissionModel || "DEDUCTED");
      setTempRate(vendor.commissionRate?.toString() || "5.0");
    }
  }, [vendor]);

  const handleUpdateCommission = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "UPDATE_COMMISSION", 
          commissionModel: tempModel, 
          commissionRate: parseFloat(tempRate) 
        })
      });
      if (!res.ok) throw new Error("Failed to update commission settings");
      toast.success("Commission settings updated");
      setIsCommissionDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!vendor) return null;

  return (
    <>
      <Card className="rounded-[2.5rem] border-zinc-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
        <CardHeader className="p-6 sm:p-8 border-b border-zinc-50 bg-swiggy-navy relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-swiggy-orange/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 flex-1 min-w-[240px]">
              <div className="w-12 h-12 rounded-full border-2 border-swiggy-orange/30 flex items-center justify-center bg-swiggy-orange/10 shadow-inner shrink-0">
                <CreditCard className="w-5 h-5 text-swiggy-orange" />
              </div>
              <CardTitle className="text-xl font-black text-white leading-tight">
                Commission Settings
              </CardTitle>
            </div>
            <Button 
              className="shrink-0 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-8 rounded-2xl shadow-lg shadow-swiggy-orange/30 h-12 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]"
              onClick={() => setIsCommissionDialogOpen(true)}
            >
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-6">
            <div className="p-6 rounded-[2rem] bg-zinc-50/50 border-2 border-zinc-100/50 hover:border-zinc-200 transition-all duration-300">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-swiggy-gray mb-4">Model</p>
              <p className="text-3xl font-black text-swiggy-navy tracking-tight">
                {vendor.commissionModel === 'ADD_ON' ? 'Add-on Model' : 'Deducted Model'}
              </p>
              <p className="text-sm font-medium text-swiggy-gray mt-3 leading-relaxed max-w-[90%]">
                {vendor.commissionModel === 'ADD_ON' 
                  ? 'Platform fee is added on top of vendor price. Vendor receives full amount while customer pays the extra fee.' 
                  : 'Platform fee is deducted from vendor price. Vendor receives the amount after platform commission is taken.'}
              </p>
            </div>
            
            <div className="p-6 rounded-[2rem] bg-zinc-50/50 border-2 border-zinc-100/50 hover:border-zinc-200 transition-all duration-300">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-swiggy-gray mb-4">Rate</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black text-swiggy-navy tracking-tighter">{vendor.commissionRate}</span>
                <span className="text-2xl font-black text-swiggy-orange">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100%-2rem)] p-0 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
          <div className="p-6 sm:p-10 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl sm:text-3xl font-black text-swiggy-navy tracking-tight text-white sm:text-swiggy-navy">Platform Commission Model</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm font-medium text-swiggy-gray mt-2 sm:mt-3">
                Select the commission structure for this vendor. These settings will affect pricing and payouts.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 sm:px-10 py-4 sm:py-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 scrollbar-hide">
            {/* Add-on Model Card */}
            <div 
              onClick={() => setTempModel('ADD_ON')}
              className={`group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                tempModel === 'ADD_ON' 
                  ? 'border-swiggy-orange bg-swiggy-orange/5 shadow-md scale-[1.02]' 
                  : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="flex gap-4 sm:gap-5">
                <div className={`mt-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  tempModel === 'ADD_ON' ? 'border-swiggy-orange bg-swiggy-orange' : 'border-zinc-200 group-hover:border-zinc-300'
                }`}>
                  {tempModel === 'ADD_ON' && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-in zoom-in duration-300" />}
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-black text-swiggy-navy uppercase tracking-tight">Add-on Model</h4>
                  <p className="text-xs sm:text-sm font-bold text-swiggy-gray mt-1 sm:mt-2 leading-relaxed">
                    <span className="text-swiggy-orange">{tempRate || "0"}%</span> is added on top. Customer pays more.
                  </p>
                </div>
              </div>
            </div>

            {/* Deducted Model Card */}
            <div 
              onClick={() => setTempModel('DEDUCTED')}
              className={`group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                tempModel === 'DEDUCTED' 
                  ? 'border-swiggy-orange bg-swiggy-orange/5 shadow-md scale-[1.02]' 
                  : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="flex gap-4 sm:gap-5">
                <div className={`mt-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  tempModel === 'DEDUCTED' ? 'border-swiggy-orange bg-swiggy-orange' : 'border-zinc-200 group-hover:border-zinc-300'
                }`}>
                  {tempModel === 'DEDUCTED' && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-in zoom-in duration-300" />}
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-black text-swiggy-navy uppercase tracking-tight">Deducted Model</h4>
                  <p className="text-xs sm:text-sm font-bold text-swiggy-gray mt-1 sm:mt-2 leading-relaxed">
                    <span className="text-swiggy-orange">{tempRate || "0"}%</span> is deducted. You take a cut.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 sm:pt-8 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-swiggy-gray ml-1">Commission Rate (%)</Label>
                <div className="flex items-center gap-2 bg-swiggy-orange/10 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 border border-swiggy-orange/20">
                   <span className="text-xs sm:text-sm font-black text-swiggy-orange">{tempRate || "0"}%</span>
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="number"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl border-2 border-zinc-100 bg-zinc-50/50 px-6 sm:px-8 font-black text-xl sm:text-2xl text-swiggy-navy focus:border-swiggy-orange focus:bg-white outline-none transition-all placeholder:text-zinc-300 shadow-inner"
                  placeholder="5.0"
                  step="0.1"
                />
                <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2">
                   <span className="text-lg font-black text-swiggy-gray/30">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 bg-zinc-50/50 border-t border-zinc-100 flex gap-3 sm:gap-4 shrink-0">
            <Button 
              variant="ghost" 
              className="flex-1 h-12 sm:h-16 rounded-xl sm:rounded-[1.25rem] font-black text-xs sm:text-sm text-swiggy-gray hover:bg-zinc-100 uppercase tracking-widest transition-all" 
              onClick={() => setIsCommissionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-[2] h-12 sm:h-16 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black rounded-xl sm:rounded-[1.25rem] shadow-xl shadow-swiggy-orange/20 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm" 
              onClick={handleUpdateCommission}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
