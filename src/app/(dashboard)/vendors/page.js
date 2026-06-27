"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Clock,
  Mail,
  Phone as PhoneIcon,
  Store
} from "lucide-react";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import LocationPicker from "@/components/LocationPicker";

// Mock Data removed

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-700 border-gray-200" },
  KYC_SUBMITTED: { label: "KYC Submitted", color: "bg-blue-100 text-blue-700 border-blue-200" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  APPROVED: { label: "Approved", color: "bg-purple-100 text-purple-700 border-purple-200" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700 border-green-200" },
  SUSPENDED: { label: "Suspended", color: "bg-orange-100 text-orange-700 border-orange-200" },
  DISABLED: { label: "Disabled", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultOperatingHours = () =>
  WEEK_DAYS.reduce((acc, d) => ({ ...acc, [d]: { isClosed: false, open: '09:00', close: '22:00' } }), {});

export default function VendorsPage() {
  const { data: vendors, loading } = useRealtime("/api/vendors", {
    toastConfig: {
      new: (v) => `New Vendor Registration!`,
      description: (v) => `${v.businessName} has registered.`
    }
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Column Definitions
  const columns = useMemo(() => [
    {
      accessorKey: "businessName",
      header: "Business Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
            <Store className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-white capitalize">{row.original.businessName}</span>
        </div>
      )
    },
    {
      accessorKey: "id",
      header: "Vendor ID",
      cell: ({ row }) => (
        <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase">{row.original.id.slice(0, 8)}...</span>
      )
    },
    {
      accessorKey: "ownerName",
      header: "Owner Name",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "sfxStoreCode",
      header: "SFX Code",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold text-[10px] border-zinc-200 uppercase">
          {row.original.sfxStoreCode || "N/A"}
        </Badge>
      )
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-medium">{row.original.category}</Badge>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status] || STATUS_CONFIG.DISABLED;
        return (
          <Badge className={`${config.color} border font-bold text-[10px] items-center gap-1`}>
            {row.original.status === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {config.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "isOnline",
      header: "Is Online",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${row.original.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">{row.original.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link href={`/vendors/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-swiggy-orange hover:text-white">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
  ], []);

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    if (statusFilter === "ALL") return vendors;
    return vendors.filter(v => v.status === statusFilter);
  }, [vendors, statusFilter]);

  const table = useReactTable({
    data: filteredVendors,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    category: "",
    address: "",
    latitude: "",
    longitude: "",
    operatingHours: defaultOperatingHours(),
    description: "",
    logo: null,
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    govId: null,
    businessProof: null,
    panCard: null,
    addressProof: null,
  });

  // Admin-managed business categories for the "Add Vendor" dropdown.
  const [categoryOptions, setCategoryOptions] = useState([]);
  useEffect(() => {
    let active = true;
    fetch("/api/categories?active=1")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (active) setCategoryOptions(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  // Per-day operating hours: toggle a weekday open/closed, or set its open/close time.
  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], isClosed: !prev.operatingHours[day].isClosed },
      },
    }));
  };
  const setDayTime = (day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], [field]: value },
      },
    }));
  };

  const handleFileChange = (e, field) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.files[0] }));
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (currentStep < 3) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (!value) return;
        // operatingHours is an object — send it as JSON so the API gets per-day open/closed.
        if (key === "operatingHours") { data.append(key, JSON.stringify(value)); return; }
        data.append(key, value);
      });

      const response = await fetch("/api/vendors", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vendor");
      }

      toast.success("Vendor created successfully with PENDING status.");
      setIsAddModalOpen(false);
      
      // Force a refresh of the vendors list
      window.location.reload(); 
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        businessName: "", ownerName: "", phone: "", email: "", category: "",
        address: "", latitude: "", longitude: "", operatingHours: defaultOperatingHours(),
        description: "", logo: null, accountHolderName: "", bankName: "", accountNumber: "",
        ifscCode: "", upiId: "", govId: null, businessProof: null,
        panCard: null, addressProof: null
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">Vendors</h1>
          <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1">Manage your restaurant partners and KYC reviews</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-6 rounded-xl h-12 gap-2 shadow-lg shadow-swiggy-orange/20">
              <Plus className="w-5 h-5" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
            <form onSubmit={handleAddVendor}>
              <div className="bg-swiggy-navy p-6 sm:p-8 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">Add New Vendor</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium text-base sm:text-lg">
                    Step {currentStep} of 3: {currentStep === 1 ? "Vendor Details" : currentStep === 2 ? "Bank Details" : "KYC Verification"}
                  </DialogDescription>
                </DialogHeader>
                
                {/* Stepper Indicator */}
                <div className="flex gap-2 mt-6">
                  {[1, 2, 3].map((step) => (
                    <div 
                      key={step} 
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                        step <= currentStep ? "bg-swiggy-orange" : "bg-zinc-700"
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {currentStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="font-bold text-zinc-700">Business Name *</Label>
                      <Input 
                        id="businessName" 
                        placeholder="e.g. The Spicy Treat" 
                        value={formData.businessName}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200 focus:ring-swiggy-orange"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerName" className="font-bold text-zinc-700">Owner Name *</Label>
                      <Input 
                        id="ownerName" 
                        placeholder="e.g. Rahul Sharma" 
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-bold text-zinc-700">Phone Number *</Label>
                      <Input 
                        id="phone" 
                        placeholder="+91 XXXXX XXXXX" 
                        value={formData.phone}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-bold text-zinc-700">Email Address *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="owner@example.com" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address" className="font-bold text-zinc-700">Business Address *</Label>
                      <Textarea 
                        id="address" 
                        placeholder="Full street address..." 
                        value={formData.address}
                        onChange={handleInputChange}
                        required 
                        className="min-h-[100px] rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="font-bold text-zinc-700">Business Category *</Label>
                      <Select value={formData.category} onValueChange={handleSelectChange} required>
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.length === 0 ? (
                            <SelectItem value="General">General</SelectItem>
                          ) : (
                            categoryOptions.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-zinc-700">Operating Hours *</Label>
                      <p className="text-xs text-zinc-500">Toggle a day off if the store is closed that day.</p>
                      <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                        {WEEK_DAYS.map((day) => {
                          const cfg = formData.operatingHours[day];
                          return (
                            <div key={day} className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="flex items-center gap-3 w-36 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  role="switch"
                                  aria-checked={!cfg.isClosed}
                                  aria-label={`Toggle ${day} open or closed`}
                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${cfg.isClosed ? "bg-zinc-300" : "bg-emerald-500"}`}
                                >
                                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${cfg.isClosed ? "translate-x-0.5" : "translate-x-[22px]"}`} />
                                </button>
                                <span className={`text-sm font-semibold ${cfg.isClosed ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{day}</span>
                              </div>
                              {cfg.isClosed ? (
                                <span className="text-sm italic text-zinc-400">Closed</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={cfg.open}
                                    onChange={(e) => setDayTime(day, "open", e.target.value)}
                                    className="h-10 w-28 rounded-lg border-zinc-200"
                                  />
                                  <span className="text-zinc-400">–</span>
                                  <Input
                                    type="time"
                                    value={cfg.close}
                                    onChange={(e) => setDayTime(day, "close", e.target.value)}
                                    className="h-10 w-28 rounded-lg border-zinc-200"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <LocationPicker 
                      latitude={formData.latitude} 
                      longitude={formData.longitude} 
                      onLocationChange={(lat, lng) => {
                        setFormData(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
                      }}
                      onAddressChange={(address) => {
                        setFormData(prev => ({ ...prev, address }));
                      }}
                    />
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description" className="font-bold text-zinc-700">Store Description (Optional)</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Tell us about your restaurant..." 
                        value={formData.description}
                        onChange={handleInputChange}
                        className="min-h-[80px] rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="md:col-span-2 p-4 rounded-2xl border-2 border-dashed border-zinc-100 space-y-2 hover:border-swiggy-orange/30 transition-colors">
                      <Label htmlFor="logo" className="font-bold block text-zinc-700">Logo (Optional)</Label>
                      <p className="text-[10px] text-zinc-400">Choose a high-quality logo for the restaurant profile</p>
                      <Input 
                        id="logo" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "logo")}
                        className="cursor-pointer file:bg-swiggy-orange/10 file:text-swiggy-orange file:border-none file:font-bold file:rounded-lg file:px-3"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="accountHolderName" className="font-bold text-zinc-700">Account Holder Name *</Label>
                      <Input 
                        id="accountHolderName" 
                        placeholder="Name as per Bank Passbook" 
                        value={formData.accountHolderName}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName" className="font-bold text-zinc-700">Bank Name *</Label>
                      <Input 
                        id="bankName" 
                        placeholder="e.g. HDFC Bank" 
                        value={formData.bankName}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber" className="font-bold text-zinc-700">Account Number *</Label>
                      <Input 
                        id="accountNumber" 
                        placeholder="Enter Account Number" 
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode" className="font-bold text-zinc-700">IFSC Code *</Label>
                      <Input 
                        id="ifscCode" 
                        placeholder="e.g. HDFC0001234" 
                        value={formData.ifscCode}
                        onChange={handleInputChange}
                        required 
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upiId" className="font-bold text-zinc-700">UPI ID (Optional)</Label>
                      <Input 
                        id="upiId" 
                        placeholder="e.g. store@upi" 
                        value={formData.upiId}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-zinc-200"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-right-4 duration-300">
                    <p className="text-zinc-500 font-medium">Please upload clear copies of the following documents to activate the account.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-100 space-y-2 hover:border-swiggy-orange/30 transition-colors">
                        <Label htmlFor="govId" className="font-bold block">Government ID *</Label>
                        <p className="text-[10px] text-zinc-400">Passport, License, or National ID</p>
                        <Input 
                          id="govId" 
                          type="file" 
                          onChange={(e) => handleFileChange(e, "govId")}
                          required 
                          className="cursor-pointer file:bg-swiggy-orange/10 file:text-swiggy-orange file:border-none file:font-bold file:rounded-lg file:px-3"
                        />
                      </div>

                      <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-100 space-y-2 hover:border-swiggy-orange/30 transition-colors">
                        <Label htmlFor="businessProof" className="font-bold block">Business Proof *</Label>
                        <p className="text-[10px] text-zinc-400">Registration, GST, or License</p>
                        <Input 
                          id="businessProof" 
                          type="file" 
                          onChange={(e) => handleFileChange(e, "businessProof")}
                          required 
                          className="cursor-pointer file:bg-swiggy-orange/10 file:text-swiggy-orange file:border-none file:font-bold file:rounded-lg file:px-3"
                        />
                      </div>

                      <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-100 space-y-2 hover:border-swiggy-orange/30 transition-colors">
                        <Label htmlFor="panCard" className="font-bold block">PAN Card *</Label>
                        <p className="text-[10px] text-zinc-400">Personal or Business PAN</p>
                        <Input 
                          id="panCard" 
                          type="file" 
                          onChange={(e) => handleFileChange(e, "panCard")}
                          required 
                          className="cursor-pointer file:bg-swiggy-orange/10 file:text-swiggy-orange file:border-none file:font-bold file:rounded-lg file:px-3"
                        />
                      </div>

                      <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-100 space-y-2 hover:border-swiggy-orange/30 transition-colors">
                        <Label htmlFor="addressProof" className="font-bold block">Address Proof *</Label>
                        <p className="text-[10px] text-zinc-400">Utility Bill or Rent Agreement</p>
                        <Input 
                          id="addressProof" 
                          type="file" 
                          onChange={(e) => handleFileChange(e, "addressProof")}
                          required 
                          className="cursor-pointer file:bg-swiggy-orange/10 file:text-swiggy-orange file:border-none file:font-bold file:rounded-lg file:px-3"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-between gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="font-bold h-12 px-6 rounded-xl" 
                  onClick={currentStep === 1 ? () => setIsAddModalOpen(false) : prevStep}
                  disabled={isSubmitting}
                >
                  {currentStep === 1 ? "Cancel" : "Back"}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black h-12 px-10 rounded-xl shadow-lg shadow-swiggy-orange/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : currentStep === 3 ? "Complete Registration" : "Next Step"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Table Area */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiggy-gray" />
            <Input 
              placeholder="Search by business name or phone..." 
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 h-11 border-zinc-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-56 h-11">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="responsive-table-container">
          <div className="rounded-2xl border border-zinc-100 overflow-hidden min-w-[1000px]">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="py-4">
                        <Skeleton className="h-6 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500 font-medium italic">
                    No vendors found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
          <p className="text-sm font-medium text-swiggy-gray">
            Showing <span className="text-swiggy-navy font-bold">{table.getState().pagination.pageIndex + 1}</span> of <span className="text-swiggy-navy font-bold">{table.getPageCount()}</span> pages
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.previousPage()} 
              disabled={!table.getCanPreviousPage()}
              className="font-bold rounded-lg px-4"
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
              className="font-bold rounded-lg px-4"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
