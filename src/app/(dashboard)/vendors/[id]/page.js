"use client";

import React, { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  FileText, 
  ShieldCheck, 
  History, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Ban,
  Slash,
  Eye,
  Plus,
  CreditCard,
  Building,
  Hash,
  User as UserIcon,
  QrCode,
  Landmark,
  Edit
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { toast } from "sonner";
import { CommissionManagement } from "@/components/vendors/CommissionManagement";
import LocationPicker from "@/components/LocationPicker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

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

const mapContainerStyle = { width: '100%', height: '256px', cursor: 'pointer' };

// KYC document slots — `field` is the multipart key the API expects, `type` matches the
// `type` label returned by the vendor GET API so we can surface the currently-stored file.
const KYC_DOC_FIELDS = [
  { field: "govId", label: "Government ID", type: "Government ID" },
  { field: "businessProof", label: "Business Proof", type: "Business Proof" },
  { field: "panCard", label: "PAN Card", type: "PAN Card" },
  { field: "addressProof", label: "Address Proof", type: "Address Proof" },
];

function VendorMap({ lat, lng }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });

  const position = { 
    lat: parseFloat(lat) || 0, 
    lng: parseFloat(lng) || 0 
  };

  const handleMapClick = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return isLoaded ? (
    <div onClick={handleMapClick} className="relative group">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={position}
        zoom={15}
        options={{
          disableDefaultUI: true,
          gestureHandling: 'none',
        }}
      >
        <Marker position={position} />
      </GoogleMap>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-swiggy-orange" />
          <span className="text-xs font-black text-swiggy-navy uppercase tracking-widest">Open in Google Maps</span>
        </div>
      </div>
    </div>
  ) : (
    <Skeleton className="w-full h-64 rounded-b-3xl" />
  );
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id;
  
  const { data: vendor, loading, mutate } = useRealtime(`/api/vendors/${vendorId}`);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [disableDuration, setDisableDuration] = useState("1");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    category: "",
    address: "",
    latitude: "",
    longitude: "",
    description: "",
    openTime: "",
    closeTime: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [kycFiles, setKycFiles] = useState({ govId: null, businessProof: null, panCard: null, addressProof: null });
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Load the admin-managed business categories for the Edit dialog dropdown.
  useEffect(() => {
    let active = true;
    fetch("/api/categories?active=1")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (active) setCategoryOptions(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (vendor) {
      setEditForm({
        businessName: vendor.businessName || "",
        ownerName: vendor.ownerName || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        category: vendor.category || "",
        address: vendor.address || "",
        latitude: vendor.lat ? String(vendor.lat) : "",
        longitude: vendor.lng ? String(vendor.lng) : "",
        description: vendor.description || "",
        openTime: vendor.openTime || "09:00",
        closeTime: vendor.closeTime || "22:00",
        accountHolderName: vendor.bankDetails?.accountHolder || "",
        bankName: vendor.bankDetails?.bankName || "",
        accountNumber: vendor.bankDetails?.accountNumber || "",
        ifscCode: vendor.bankDetails?.ifscCode || "",
        upiId: vendor.bankDetails?.upiId || "",
      });
    }
  }, [vendor]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.businessName || !editForm.ownerName || !editForm.phone) {
      return toast.error("Business name, owner name, and phone are required.");
    }
    setUpdatingDetails(true);
    try {
      // 1. Save the general business + bank details (JSON).
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DETAILS",
          ...editForm,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vendor details");

      // 2. If the admin picked any replacement KYC documents, upload them (multipart).
      const selectedDocs = Object.entries(kycFiles).filter(([, file]) => file);
      if (selectedDocs.length > 0) {
        const fd = new FormData();
        selectedDocs.forEach(([field, file]) => fd.append(field, file));
        const kycRes = await fetch(`/api/vendors/${vendorId}/kyc`, {
          method: "PUT",
          body: fd,
        });
        const kycData = await kycRes.json();
        if (!kycRes.ok) throw new Error(kycData.error || "Vendor details saved, but updating KYC documents failed.");
      }

      toast.success("Vendor details updated successfully!");
      setIsEditModalOpen(false);
      setKycFiles({ govId: null, businessProof: null, panCard: null, addressProof: null });
      mutate();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingDetails(false);
    }
  };

  const [earningsData, setEarningsData] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  useEffect(() => {
    if (activeTab === "earnings" && !earningsData) {
      fetchEarnings();
    }
  }, [activeTab]);

  const fetchEarnings = async () => {
    setLoadingEarnings(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/earnings`);
      if (res.ok) {
        const data = await res.json();
        setEarningsData(data);
      }
    } catch (error) {
      toast.error("Failed to fetch earnings history");
    } finally {
      setLoadingEarnings(false);
    }
  };

  const handleSettleEarnings = async () => {
    if (!vendorId) return;
    setLoadingEarnings(true);
    try {
      const res = await fetch("/api/payments/mock/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.batchId) {
          toast.success(`Settled ₹${data.totalAmount.toLocaleString()} across ${data.ordersProcessed} orders.`);
          fetchEarnings();
        } else {
          toast.info(data.message || "No pending earnings to settle.");
        }
      } else {
        throw new Error(data.error || "Settlement failed");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const handleApproveKYC = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_KYC" })
      });
      if (!res.ok) throw new Error("Failed to approve KYC");
      toast.success("KYC Approved successfully");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRejectKYC = async () => {
    if (!rejectReason) return toast.error("Please provide a rejection reason.");
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT_KYC", reason: rejectReason })
      });
      if (!res.ok) throw new Error("Failed to reject KYC");
      toast.error(`KYC Rejected: ${rejectReason}`);
      setIsRejectDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSuspend = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUSPEND" })
      });
      if (!res.ok) throw new Error("Failed to suspend vendor");
      toast.warning("Vendor suspended");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDisable = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISABLE", duration: disableDuration })
      });
      if (!res.ok) throw new Error("Failed to disable vendor");
      if (disableDuration === "permanent") {
        toast.error("Vendor disabled permanently");
      } else {
        toast.error(`Vendor disabled for ${disableDuration} hour(s)`);
      }
      setIsDisableDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REACTIVATE" })
      });
      if (!res.ok) throw new Error("Failed to reactivate vendor");
      toast.success("Vendor reactivated");
    } catch (error) {
      toast.error(error.message);
    }
  };



  const handleApproveVendor = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_VENDOR" })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed to approve vendor");
      }
      toast.success("Vendor approved successfully and is now ACTIVE");
      mutate();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRejectVendor = async () => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT_VENDOR" })
      });
      if (!res.ok) throw new Error("Failed to reject vendor");
      toast.error("Vendor application rejected");
    } catch (error) {
      toast.error(error.message);
    }
  };
  if (loading || !vendor) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="rounded-xl border border-zinc-200 shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight truncate">{vendor.businessName}</h1>
              {(() => {
                const isTempDisabled = vendor.status && vendor.status.startsWith("DISABLED:");
                const config = isTempDisabled 
                  ? { label: "Disabled (Temp)", color: "bg-red-50 text-red-700 border-red-200" } 
                  : (STATUS_CONFIG[vendor.status] || STATUS_CONFIG.DISABLED);
                return (
                  <Badge className={`${config.color} font-bold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap`}>
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1 truncate">Vendor ID: {vendor.id} • Registered on March 20, 2026</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsEditModalOpen(true)} 
          className="bg-swiggy-orange hover:bg-swiggy-orange/95 text-white font-black px-6 py-2 h-11 rounded-xl shadow-lg shadow-swiggy-orange/10 flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap self-start sm:self-center"
        >
          <Edit className="w-4 h-4" /> Edit Details
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex min-w-max bg-white dark:bg-zinc-900 border border-zinc-100 p-1 rounded-xl h-12 sm:h-14">
              <TabsTrigger value="overview" className="rounded-lg px-4 sm:px-6 font-bold h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="bank" className="rounded-lg px-4 sm:px-6 font-bold h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all text-xs sm:text-sm">
                Bank Details
              </TabsTrigger>
              <TabsTrigger value="kyc" className="rounded-lg px-4 sm:px-6 font-bold h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all text-xs sm:text-sm">
                KYC Documents
              </TabsTrigger>
              <TabsTrigger value="actions" className="rounded-lg px-4 sm:px-6 font-bold h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all text-xs sm:text-sm">
                Actions & Logs
              </TabsTrigger>
              <TabsTrigger value="earnings" className="rounded-lg px-4 sm:px-6 font-bold h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all text-xs sm:text-sm">
                Earnings
              </TabsTrigger>
            </TabsList>
          </div>

          {activeTab === "kyc" && (vendor.kycStatus === "KYC_SUBMITTED" || vendor.kycStatus === "UNDER_REVIEW") && (
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none text-red-500 border-red-100 hover:bg-red-50 font-bold h-10 sm:h-11 text-xs sm:text-sm"
                onClick={() => setIsRejectDialogOpen(true)}
              >
                Reject KYC
              </Button>
              <Button 
                className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white font-bold h-10 sm:h-11 text-xs sm:text-sm"
                onClick={handleApproveKYC}
              >
                Approve KYC
              </Button>
            </div>
          )}
        </div>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Vendor Information Card */}
            <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-lg shadow-zinc-200/50 border border-zinc-50 cursor-pointer" onClick={() => window.open(vendor.logoUrl, "_blank")}>
                      <img src={vendor.logoUrl} alt="Logo" className="w-full h-full rounded-xl object-cover" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-swiggy-navy uppercase tracking-tight">{vendor.businessName}</h3>
                      <p className="text-xs sm:text-sm font-medium text-swiggy-gray">{vendor.category} • Specialist</p>
                    </div>
                  </div>
                  <div className="h-8 px-3 rounded-full border border-zinc-150 bg-zinc-50 flex items-center gap-1.5 shrink-0 self-center sm:self-end mb-1">
                     <div className={`w-2 h-2 rounded-full ${vendor.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{vendor.isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-zinc-50">
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <Phone className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Phone</p>
                        <p className="text-sm font-bold text-swiggy-navy">{vendor.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <Mail className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Email</p>
                        <p className="text-sm font-bold text-swiggy-navy">{vendor.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <CreditCard className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Bank Details</p>
                        {vendor.bankDetails ? (
                          <p className="text-sm font-bold text-swiggy-navy">
                            {vendor.bankDetails.bankName} • {vendor.bankDetails.accountNumber.slice(-4)}
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-red-400 italic">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <MapPin className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Address</p>
                        <p className="text-sm font-bold text-swiggy-navy leading-relaxed">{vendor.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <ShieldCheck className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">KYC Status</p>
                        <Badge variant="outline" className={`mt-1 font-bold ${vendor.kycStatus === 'APPROVED' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-yellow-600 border-yellow-100 bg-yellow-50'}`}>
                          {vendor.kycStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        <Clock className="w-4 h-4 text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Vendor Status</p>
                        {(() => {
                          const isTempDisabled = vendor.status && vendor.status.startsWith("DISABLED:");
                          const config = isTempDisabled 
                            ? { label: "Disabled (Temp)", color: "bg-red-50 text-red-700 border-red-200" } 
                            : (STATUS_CONFIG[vendor.status] || STATUS_CONFIG.DISABLED);
                          return (
                            <Badge className={`${config.color} mt-1 font-bold text-[10px] uppercase tracking-wider`}>
                              {config.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-100 shadow-sm">
              <CardHeader className="p-8 border-b border-zinc-50">
                <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-swiggy-orange" /> Store Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-3xl">
                <VendorMap lat={vendor.lat} lng={vendor.lng} />
              </CardContent>
            </Card>
            <CommissionManagement vendor={vendor} vendorId={vendorId} onUpdated={mutate} />
          </div>

          <div className="space-y-6">
            {/* Approval Action Card */}
            <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
               <CardHeader className="p-8 border-b border-zinc-50 bg-swiggy-navy">
                 <CardTitle className="text-lg font-black text-white inline-flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-swiggy-orange" /> Approval Actions
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-4">
                 <Button
                   className={`w-full h-14 font-black uppercase tracking-widest rounded-2xl gap-3 shadow-lg ${
                     vendor.status === 'ACTIVE'
                       ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                       : 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                   }`}
                   onClick={handleApproveVendor}
                   disabled={vendor.status === 'ACTIVE'}
                 >
                   <CheckCircle2 className="w-5 h-5" />
                   {vendor.status === 'ACTIVE' ? 'Vendor Active' : 'Approve Vendor'}
                 </Button>

                 <Button 
                   variant="outline"
                   className="w-full h-14 border-red-200 text-red-500 hover:bg-red-50 font-black uppercase tracking-widest rounded-2xl gap-3"
                   onClick={handleRejectVendor}
                   disabled={vendor.status === 'ACTIVE' || vendor.status === 'REJECTED'}
                 >
                   <XCircle className="w-5 h-5" /> Reject Application
                 </Button>
               </CardContent>
            </Card>


            <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
               <CardHeader className="p-8 border-b border-zinc-50 bg-swiggy-navy">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-lg font-black text-white inline-flex items-center gap-2">
                     <AlertTriangle className="w-5 h-5 text-swiggy-orange" /> Compliance
                   </CardTitle>
                   <Button 
                    size="sm" 
                    className="h-8 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-bold rounded-lg"
                    onClick={() => setIsFlagDialogOpen(true)}
                   >
                     <Plus className="w-4 h-4 mr-1" /> Add Flag
                   </Button>
                 </div>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                 {vendor.complianceFlags.map((flag, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-red-50 border border-red-100 relative group animate-in slide-in-from-top-2">
                     <Badge className="bg-red-500 text-white mb-2 font-bold text-[9px] uppercase tracking-widest">
                       {flag.type}
                     </Badge>
                     <p className="text-xs font-bold text-red-900 leading-relaxed mb-2">
                       {flag.description}
                     </p>
                     <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest inline-flex items-center gap-1">
                       <Clock className="w-2.5 h-2.5" /> Flagged on {flag.date}
                     </p>
                   </div>
                 ))}
                 {vendor.complianceFlags.length === 0 && (
                   <div className="text-center py-8">
                     <CheckCircle2 className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
                     <p className="text-sm font-bold text-zinc-400 italic">No compliance issues reported.</p>
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bank Details Tab Content */}
        <TabsContent value="bank" className="animate-in slide-in-from-bottom-4 duration-500">
          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="p-8 border-b border-zinc-50 bg-swiggy-navy text-white">
                <CardTitle className="text-lg font-black inline-flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-swiggy-orange" /> Settlement Account Info
                </CardTitle>
                <CardDescription className="text-zinc-400 font-medium">Bank details used for weekly settlements and payouts.</CardDescription>
             </CardHeader>
             <CardContent className="p-8">
                {vendor.bankDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <UserIcon className="w-5 h-5 text-swiggy-navy" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Account Holder</p>
                          <p className="text-base font-black text-swiggy-navy mt-0.5">{vendor.bankDetails.accountHolder}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Building className="w-5 h-5 text-swiggy-navy" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Bank Name</p>
                          <p className="text-base font-black text-swiggy-navy mt-0.5">{vendor.bankDetails.bankName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Hash className="w-5 h-5 text-swiggy-navy" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Account Number</p>
                          <p className="text-base font-black text-swiggy-navy mt-0.5 tracking-wider">{vendor.bankDetails.accountNumber}</p>
                          <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> IFSC: {vendor.bankDetails.ifscCode}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <QrCode className="w-5 h-5 text-swiggy-navy" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">UPI ID</p>
                          <p className="text-base font-black text-swiggy-navy mt-0.5">{vendor.bankDetails.upiId || "Not Provided"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 text-zinc-100 mx-auto mb-3" />
                    <p className="text-sm font-bold text-zinc-400 italic">No bank details found for this vendor.</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Tab Content */}
        <TabsContent value="kyc" className="animate-in slide-in-from-right-4 duration-500">
          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="p-8 border-b border-zinc-50">
                <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-swiggy-orange" /> Submitted Documents
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="divide-y divide-zinc-50">
                  {vendor.kycDocuments.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-8 hover:bg-zinc-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-swiggy-orange/5 border border-swiggy-orange/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-swiggy-orange" />
                          </div>
                          <div>
                            <h4 className="font-black text-swiggy-navy uppercase text-sm tracking-tight">{doc.type}</h4>
                            <p className="text-xs font-medium text-swiggy-gray mt-1">Submitted on {doc.date}</p>
                          </div>
                       </div>
                       <Button 
                          variant="outline" className="rounded-xl font-bold h-11 gap-2 border-zinc-200"
                          onClick={() => {
                            let url = doc.url;
                            if (!url) return;
                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                              url = 'https://' + url;
                            }
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Eye className="w-4 h-4" /> View Document
                        </Button>
                    </div>
                  ))}
                </div>
             </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden mt-6">
             <CardHeader className="p-8 border-b border-zinc-50">
                <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2">
                  <History className="w-5 h-5 text-swiggy-orange" /> KYC Review History
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="divide-y divide-zinc-50">
                  {vendor.kycReviews && vendor.kycReviews.length > 0 ? vendor.kycReviews.map((review, i) => (
                    <div key={i} className="p-6 flex items-start gap-4 hover:bg-zinc-50/50">
                       <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${review.decision === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                         {review.decision === 'approved' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-swiggy-navy tracking-tight uppercase">DECISION: {review.decision}</p>
                         {review.reason && <p className="text-xs font-bold text-red-500 mt-1">Reason: {review.reason}</p>}
                         <p className="text-xs font-medium text-swiggy-gray mt-1 flex items-center gap-2">
                           Reviewed by: {review.by} <span className="w-1 h-1 rounded-full bg-zinc-200" /> {review.date}
                         </p>
                       </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-zinc-400 font-medium text-sm">No review history found.</div>
                  )}
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab Content */}
        <TabsContent value="actions" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in animate-in slide-in-from-bottom-4 duration-500">
          <Card className="rounded-3xl border-zinc-100 shadow-sm h-fit">
            <CardHeader className="p-8 border-b border-zinc-50">
                <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2">
                  <Slash className="w-5 h-5 text-swiggy-orange" /> Status Management
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-4">
                {vendor.status === 'ACTIVE' && (
                  <Button 
                    className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl gap-3 shadow-lg shadow-orange-100"
                    onClick={handleSuspend}
                  >
                    <Ban className="w-5 h-5" /> Suspend Vendor
                  </Button>
                )}
                {(vendor.status === 'ACTIVE' || vendor.status === 'SUSPENDED') && (
                  <Button 
                    variant="outline"
                    className="w-full h-14 border-red-200 text-red-500 hover:bg-red-50 font-black uppercase tracking-widest rounded-2xl gap-3"
                    onClick={() => setIsDisableDialogOpen(true)}
                  >
                    <XCircle className="w-5 h-5" /> Disable Vendor (Temporary / Permanent)
                  </Button>
                )}
                {vendor.status === 'SUSPENDED' && (
                  <Button 
                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest rounded-2xl gap-3 shadow-lg shadow-green-100"
                    onClick={handleReactivate}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Reactivate Vendor
                  </Button>
                )}
             </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="p-8 border-b border-zinc-50">
                <CardTitle className="text-lg font-black text-swiggy-navy inline-flex items-center gap-2">
                  <History className="w-5 h-5 text-swiggy-orange" /> Administrative Logs
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="divide-y divide-zinc-50">
                  {vendor.adminActions && vendor.adminActions.length > 0 ? vendor.adminActions.map((log, i) => (
                    <div key={i} className="p-6 flex items-start gap-4 hover:bg-zinc-50/50">
                       <div className="w-8 h-8 rounded-lg bg-zinc-100 flex-shrink-0 flex items-center justify-center">
                         <ShieldCheck className="w-4 h-4 text-zinc-400" />
                       </div>
                       <div>
                         <p className="text-sm font-bold text-swiggy-navy tracking-tight">{log.action}</p>
                         <p className="text-xs font-medium text-swiggy-gray mt-1">
                           <span className="font-bold text-zinc-600">{log.oldStatus || "N/A"}</span> ➔ <span className="font-bold text-zinc-900">{log.action.replace("STATUS_CHANGED_", "")}</span>
                         </p>
                         {log.reason && <p className="text-xs text-red-500 mt-1 italic">Reason: {log.reason}</p>}
                         <p className="text-xs font-medium text-zinc-400 mt-2 flex items-center gap-2">
                           Changed by: {log.by} <span className="w-1 h-1 rounded-full bg-zinc-200" /> {log.date}
                         </p>
                       </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-zinc-400 font-medium text-sm">No status logs found.</div>
                  )}
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab Content */}
        <TabsContent value="earnings" className="animate-in slide-in-from-right-4 duration-500 space-y-6">
          {loadingEarnings || !earningsData ? (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
               </div>
               <Skeleton className="h-[400px] rounded-3xl" />
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                {[
                  { label: "Gross Revenue", value: `₹${earningsData.summary.grossEarnings.toLocaleString()}`, color: "text-zinc-900", bg: "bg-zinc-50" },
                  { label: "Commission", value: `₹${earningsData.summary.commissionDeducted.toLocaleString()}`, color: "text-red-500", bg: "bg-red-50" },
                  { label: "Net Earnings", value: `₹${earningsData.summary.netEarnings.toLocaleString()}`, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Settled Funds", value: `₹${earningsData.summary.completedPayouts.toLocaleString()}`, color: "text-blue-600", bg: "bg-blue-50" }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <p className="text-[10px] font-black text-swiggy-gray uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      <div className={`mt-2 h-1 w-12 rounded-full ${stat.bg.replace('bg-', 'bg-').replace('50', '200')}`} />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {earningsData.summary.pendingPayouts > 0 && (
                <div className="flex justify-end">
                  <Button 
                    className="bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black uppercase tracking-widest px-8 rounded-2xl shadow-xl shadow-swiggy-orange/20 h-16 gap-3 animate-in zoom-in-95"
                    onClick={handleSettleEarnings}
                  >
                    <Landmark className="w-5 h-5" /> Settle ₹{earningsData.summary.pendingPayouts.toLocaleString()} Outstanding
                  </Button>
                </div>
              )}

              <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
                <CardHeader className="p-8 border-b border-zinc-50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black text-swiggy-navy uppercase tracking-tight">Earnings History</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Order-wise breakdown and payout status</CardDescription>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3">Sandbox Ledger</Badge>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                     <Table>
                        <TableHeader className="bg-zinc-50">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-8 py-5">Order ID</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Gross Amt</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Platform Fee</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Net Payout</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest">Earned At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earningsData.history.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-40 text-center text-zinc-400 font-bold italic">No earnings records found</TableCell>
                            </TableRow>
                          ) : (
                            earningsData.history.map((row, i) => (
                              <TableRow key={i} className="hover:bg-zinc-50/50 border-zinc-50">
                                <TableCell className="pl-8 py-4 font-mono text-[11px] font-bold text-swiggy-navy uppercase">{row.orderId.slice(0, 12)}...</TableCell>
                                <TableCell className="font-bold text-sm">₹{row.gross.toLocaleString()}</TableCell>
                                <TableCell className="text-red-500 font-bold text-sm">-₹{row.commissionAmt.toLocaleString()} <span className="text-[10px] text-zinc-400 ml-1">({row.commissionRate}%)</span></TableCell>
                                <TableCell className="text-emerald-600 font-black text-sm">₹{row.net.toLocaleString()}</TableCell>
                                <TableCell>
                                  {row.status === "PAID" ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px] uppercase tracking-wider">Paid</Badge>
                                  ) : row.status === "REFUNDED" ? (
                                    <Badge className="bg-red-100 text-red-700 border-none font-bold text-[10px] uppercase tracking-wider">Refunded</Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[10px] uppercase tracking-wider">Pending Settlement</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-[10px] font-bold text-swiggy-gray uppercase tracking-widest">{new Date(row.date).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                     </Table>
                   </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-swiggy-navy">Rejection Reason</DialogTitle>
            <DialogDescription className="font-medium">
              Please provide the reason for rejecting this vendor's KYC documents. This will be visible to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g. FSSAI License is expired. Please upload the latest valid license." 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[120px] rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="font-bold" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 font-bold px-6" onClick={handleRejectKYC}>Submit Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Compliance Flag Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-swiggy-navy">Add Compliance Flag</DialogTitle>
            <DialogDescription className="font-medium">
              Manually flag this vendor for non-compliance or performance issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Flag Type</Label>
              <Select defaultValue="LOW_RATING">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW_RATING">Low Rating</SelectItem>
                  <SelectItem value="SLA_BREACH">SLA Breach</SelectItem>
                  <SelectItem value="HIGH_REJECTION_RATE">High Rejection Rate</SelectItem>
                  <SelectItem value="CUSTOMER_COMPLAINT">Customer Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Description</Label>
              <Textarea 
                placeholder="Provide details about the compliance issue..." 
                className="min-h-[100px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="font-bold" onClick={() => setIsFlagDialogOpen(false)}>Cancel</Button>
            <Button className="bg-swiggy-orange hover:bg-swiggy-orange/90 font-black px-8" onClick={() => {
              toast.info("Compliance flag added");
              setIsFlagDialogOpen(false);
            }}>Add Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Vendor Dialog */}
      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Disable Vendor Account
            </DialogTitle>
            <DialogDescription className="font-medium text-zinc-500">
              Select the duration for disablement. The vendor app will show a ticking countdown for temporary durations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-swiggy-navy">Select Duration</Label>
              <Select value={disableDuration} onValueChange={setDisableDuration}>
                <SelectTrigger className="h-11 rounded-xl font-bold">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1" className="font-bold">1 Hour</SelectItem>
                  <SelectItem value="6" className="font-bold">6 Hours</SelectItem>
                  <SelectItem value="12" className="font-bold">12 Hours</SelectItem>
                  <SelectItem value="24" className="font-bold">24 Hours</SelectItem>
                  <SelectItem value="72" className="font-bold">3 Days</SelectItem>
                  <SelectItem value="168" className="font-bold">1 Week</SelectItem>
                  <SelectItem value="permanent" className="font-bold text-red-600">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="font-bold" onClick={() => setIsDisableDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 font-bold px-6" onClick={handleDisable}>Confirm Disablement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Details Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) setKycFiles({ govId: null, businessProof: null, panCard: null, addressProof: null });
      }}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-zinc-100 shadow-2xl p-0">
          <DialogHeader className="p-8 pb-4 border-b border-zinc-50">
            <DialogTitle className="text-2xl font-black text-swiggy-navy uppercase tracking-tight flex items-center gap-2">
              <Edit className="w-6 h-6 text-swiggy-orange" /> Edit Vendor Details
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-zinc-500">
              Modify the general business details, bank settlement information, and KYC documents for <strong>{vendor.businessName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <div className="px-8 border-b border-zinc-50 bg-zinc-50/50 py-2">
                <TabsList className="bg-transparent border-0 gap-4 p-0">
                  <TabsTrigger value="general" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-swiggy-navy data-[state=active]:shadow-sm text-xs sm:text-sm">
                    General Info
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-swiggy-navy data-[state=active]:shadow-sm text-xs sm:text-sm">
                    Bank Details
                  </TabsTrigger>
                  <TabsTrigger value="kyc" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-swiggy-navy data-[state=active]:shadow-sm text-xs sm:text-sm">
                    KYC Documents
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="general" className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Business Name</Label>
                    <Input
                      required
                      placeholder="e.g. Swiggy Delights"
                      value={editForm.businessName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, businessName: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Owner Name</Label>
                    <Input
                      required
                      placeholder="e.g. Syed Wameez"
                      value={editForm.ownerName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, ownerName: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Phone Number</Label>
                    <Input
                      required
                      placeholder="e.g. +91 9876543210"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="e.g. contact@business.com"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Business Category</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, category: val }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const names = categoryOptions.map((c) => c.name);
                          // Keep the vendor's current category selectable even if it was
                          // since disabled or predates the managed list.
                          if (editForm.category && !names.includes(editForm.category)) {
                            names.unshift(editForm.category);
                          }
                          return names.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Open Time</Label>
                      <Input
                        type="time"
                        value={editForm.openTime}
                        onChange={(e) => setEditForm(prev => ({ ...prev, openTime: e.target.value }))}
                        className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Close Time</Label>
                      <Input
                        type="time"
                        value={editForm.closeTime}
                        onChange={(e) => setEditForm(prev => ({ ...prev, closeTime: e.target.value }))}
                        className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Store Description</Label>
                  <Textarea
                    placeholder="Provide a brief store outline..."
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[80px] rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm p-4"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Store Location Map Coordinates & Address</Label>
                  <LocationPicker
                    latitude={editForm.latitude}
                    longitude={editForm.longitude}
                    onLocationChange={(lat, lng) => {
                      setEditForm(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
                    }}
                    onAddressChange={(addr) => {
                      setEditForm(prev => ({ ...prev, address: addr }));
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bank" className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Bank Name</Label>
                    <Input
                      placeholder="e.g. HDFC Bank"
                      value={editForm.bankName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Account Holder Name</Label>
                    <Input
                      placeholder="e.g. Syed Wameez"
                      value={editForm.accountHolderName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">Account Number</Label>
                    <Input
                      placeholder="e.g. 501002345678"
                      value={editForm.accountNumber}
                      onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">IFSC Code</Label>
                    <Input
                      placeholder="e.g. HDFC0000123"
                      value={editForm.ifscCode}
                      onChange={(e) => setEditForm(prev => ({ ...prev, ifscCode: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray ml-1">UPI ID (Optional)</Label>
                    <Input
                      placeholder="e.g. wameez@oksbi"
                      value={editForm.upiId}
                      onChange={(e) => setEditForm(prev => ({ ...prev, upiId: e.target.value }))}
                      className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="kyc" className="p-8 space-y-6">
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    Upload a new file only for the documents you want to replace. Documents left blank stay as they are.
                  </p>
                </div>

                <div className="space-y-5">
                  {KYC_DOC_FIELDS.map((doc) => {
                    const currentUrl = vendor.kycDocuments?.find(d => d.type === doc.type)?.url;
                    const selectedFile = kycFiles[doc.field];
                    return (
                      <div key={doc.field} className="flex flex-col gap-2 rounded-2xl border border-zinc-100 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-black uppercase tracking-wider text-swiggy-navy">{doc.label}</Label>
                          {currentUrl ? (
                            <a
                              href={currentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-swiggy-orange hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> View current
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-red-400 italic">Not uploaded</span>
                          )}
                        </div>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setKycFiles(prev => ({ ...prev, [doc.field]: e.target.files?.[0] || null }))}
                          className="h-12 rounded-xl border border-zinc-200 font-bold focus:border-swiggy-orange text-sm px-4 py-2.5 file:mr-3 file:rounded-lg file:bg-swiggy-orange/10 file:px-3 file:py-1.5 file:font-bold file:text-swiggy-orange cursor-pointer"
                        />
                        {selectedFile && (
                          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> New file selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-8 border-t border-zinc-50 bg-zinc-50/20 gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold h-12 px-6 border-zinc-200"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setKycFiles({ govId: null, businessProof: null, panCard: null, addressProof: null });
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl font-bold h-12 px-8 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white shadow-lg shadow-swiggy-orange/20"
                disabled={updatingDetails}
              >
                {updatingDetails ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
