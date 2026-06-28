"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Package,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Settings2
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data removed

import Link from "next/link";
import VendorCombobox from "@/components/VendorCombobox";

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function ProductsPage() {
  const { data: products, loading } = useRealtime("/api/products", {
    toastConfig: {
      new: (p) => `New Product Submitted!`,
      description: (p) => `${p.name} from ${p.vendorName}`
    }
  });
  const { data: vendors } = useRealtime("/api/vendors");
  // Only approved/active vendors can receive products — a vendor that hasn't cleared
  // onboarding shouldn't be selectable here.
  const approvedVendors = useMemo(
    () => (vendors || []).filter((v) => ["APPROVED", "ACTIVE"].includes(v.status)),
    [vendors]
  );

  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // BYO Template States
  const [customizationType, setCustomizationType] = useState("NONE");
  const [selectedVendorForAdd, setSelectedVendorForAdd] = useState("");
  const [vendorTemplates, setVendorTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateGroups, setTemplateGroups] = useState([]);
  const [productDescription, setProductDescription] = useState("");
  // Flat add-ons (Swiggy "Make it a meal" extras): { name, price, free_limit }
  const [addOns, setAddOns] = useState([]);

  const addAddon = () =>
    setAddOns((prev) => [...prev, { id: crypto.randomUUID(), name: "", price: "", free_limit: "" }]);
  const updateAddon = (index, field, value) =>
    setAddOns((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  const removeAddon = (index) => setAddOns((prev) => prev.filter((_, i) => i !== index));

  // Admin-managed business categories for the product category dropdowns.
  const [categoryOptions, setCategoryOptions] = useState([]);
  useEffect(() => {
    let active = true;
    fetch("/api/categories?active=1")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (active) setCategoryOptions(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedVendorForAdd && customizationType === "BUILD_YOUR_OWN") {
      fetch(`/api/byo-templates`)
        .then(res => res.json())
        .then(data => setVendorTemplates(data))
        .catch(err => console.error(err));
    } else {
      setVendorTemplates([]);
      setSelectedTemplateId("");
      if (customizationType !== "NORMAL") {
        setTemplateGroups([]);
      }
    }
  }, [selectedVendorForAdd, customizationType]);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = vendorTemplates.find(t => t.id === templateId);
    if (template) {
      // Materialize the template's groups AND their options into the editable builder.
      const groupsWithOpts = (template.byo_template_groups || []).map(g => ({
        ...g,
        options: (g.byo_template_options || []).map(o => ({
          id: o.id || crypto.randomUUID(),
          name: o.name,
          price_modifier: o.price_modifier ?? "",
          is_available: o.is_available !== false,
        })),
      }));
      setTemplateGroups(groupsWithOpts);
      if (template.description) {
        setProductDescription(template.description);
      }
    } else {
      setTemplateGroups([]);
    }
  };

  const addManualGroup = () => {
    setTemplateGroups([...templateGroups, {
      id: crypto.randomUUID(),
      name: "",
      selection_type: "SINGLE",
      is_required: false,
      max_limit: null,
      free_threshold: 0,
      extra_price: 0,
      options: []
    }]);
  };

  const updateManualGroup = (index, field, value) => {
    const newGroups = [...templateGroups];
    newGroups[index][field] = value;
    setTemplateGroups(newGroups);
  };

  const removeManualGroup = (index) => {
    const newGroups = [...templateGroups];
    newGroups.splice(index, 1);
    setTemplateGroups(newGroups);
  };

  const addOptionToGroup = (groupIndex) => {
    const newGroups = [...templateGroups];
    newGroups[groupIndex].options.push({
      id: Date.now().toString(),
      name: "",
      price_modifier: "",
      is_available: true
    });
    setTemplateGroups(newGroups);
  };

  const updateOption = (groupIndex, optIndex, field, value) => {
    const newGroups = [...templateGroups];
    newGroups[groupIndex].options[optIndex][field] = value;
    setTemplateGroups(newGroups);
  };

  const removeOption = (groupIndex, optIndex) => {
    const newGroups = [...templateGroups];
    newGroups[groupIndex].options.splice(optIndex, 1);
    setTemplateGroups(newGroups);
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return data.url;
  };

  // Status handlers
  const handleApprove = async (id) => {
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" })
      });
      if (!res.ok) throw new Error("Failed to approve product");
      toast.success("Product approved. It will now show on vendor and customer dashboards.");
      // The useRealtime hook will auto-refresh the data
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, is_active: !product.isActive })
      });
      if (!res.ok) throw new Error("Failed to update product");
      toast.success(product.isActive ? "Product disabled — hidden from customers." : "Product enabled.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" })
      });
      if (!res.ok) throw new Error("Failed to reject product");
      toast.error("Product rejected.");
      // The useRealtime hook will auto-refresh the data
    } catch (error) {
      toast.error(error.message);
    }
  };

  // CRUD handlers
  const handleDelete = async () => {
    if (selectedProduct) {
      try {
        const res = await fetch("/api/products?id=" + selectedProduct.id, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete product");
        toast.success("Product deleted successfully.");
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      setUploading(true);
      const imageUrl = await uploadImage(addImageFile);
      const isBYO = customizationType === "BUILD_YOUR_OWN";
      const hasCustomization = customizationType !== "NONE";
      const payload = {
        name: formData.get("name"),
        vendor_id: formData.get("vendorName"),
        base_price: Number(formData.get("price")),
        category: formData.get("category"),
        product_type: formData.get("type"),
        description: productDescription,
        // DB enum is NORMAL | BUILD_YOUR_OWN — "Standard" maps to NORMAL + not customizable.
        customization_type: isBYO ? "BUILD_YOUR_OWN" : "NORMAL",
        is_customizable: hasCustomization,
        imageUrl: imageUrl || "",
        // Admin is the reviewer, so admin-created products go live immediately.
        review_status: "approved",
        ...(hasCustomization && {
          template_id: isBYO ? selectedTemplateId : null,
          add_ons: addOns.map(a => ({
            name: a.name,
            price: Number(a.price) || 0,
            free_limit: Number(a.free_limit) || 0,
          })),
          customization_groups: templateGroups.map((g, i) => ({
            name: g.name,
            selection_type: g.selection_type,
            is_required: g.is_required,
            max_limit: g.max_limit,
            free_threshold: Number(g.free_threshold) || 0,
            extra_price: Number(g.extra_price) || 0,
            display_order: g.display_order ?? i,
            options: g.options.map(o => ({
              name: o.name,
              price_modifier: Number(o.price_modifier) || 0,
              is_available: Boolean(o.is_available ?? true)
            }))
          }))
        })
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create product");
      toast.success("Product created successfully.");
      setIsAddModalOpen(false);
      setAddImageFile(null);
      setAddImagePreview("");
      setCustomizationType("NONE");
      setSelectedVendorForAdd("");
      setSelectedTemplateId("");
      setTemplateGroups([]);
      setAddOns([]);
      setProductDescription("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const formData = new FormData(e.target);
    try {
      setUploading(true);
      const uploadedUrl = editImageFile ? await uploadImage(editImageFile) : null;
      const payload = {
        id: selectedProduct.id,
        name: formData.get("name"),
        base_price: Number(formData.get("price")),
        category: formData.get("category"),
        product_type: formData.get("type"),
        description: formData.get("description"),
        is_customizable: formData.get("is_customizable") === "on",
        ...(uploadedUrl && { imageUrl: uploadedUrl })
      };

      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update product");
      toast.success("Product updated successfully.");
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      setEditImageFile(null);
      setEditImagePreview("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!products) return [];
    if (statusFilter === "ALL") return products;
    return products.filter(product => {
      if (statusFilter === "PENDING_REVIEW") {
        return product.status === "PENDING_REVIEW" || product.status === "PENDING";
      }
      return product.status === statusFilter;
    });
  }, [products, statusFilter]);

  // Column Definitions
  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.imageUrl ? (
            <img 
              src={row.original.imageUrl} 
              alt={row.original.name} 
              className="w-8 h-8 rounded object-cover border border-zinc-200 cursor-pointer hover:ring-2 hover:ring-swiggy-orange transition-all" 
              onClick={() => setViewingImage(row.original.imageUrl)}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-zinc-500" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              {row.original.name}
              {row.original.is_customizable && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-swiggy-orange text-swiggy-orange bg-orange-50">Customizable</Badge>
              )}
              {row.original.isActive === false && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-zinc-300 text-zinc-500 bg-zinc-100">Disabled</Badge>
              )}
            </span>
            {row.original.description && (
              <span className="text-xs text-zinc-500 line-clamp-1 max-w-[200px]" title={row.original.description}>
                {row.original.description}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${row.original.type === 'Veg' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">{row.original.type}</span>
        </div>
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
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-bold">{row.original.price}</span>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusKey = row.original.status === "PENDING" ? "PENDING_REVIEW" : row.original.status;
        const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING_REVIEW;
        return (
          <Badge className={`${config.color} border font-bold text-[10px] items-center gap-1`}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {(row.original.status === "PENDING" || row.original.status === "PENDING_REVIEW") && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(row.original.id)} title="Approve">
                <CheckCircle2 className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(row.original.id)} title="Reject">
                <XCircle className="w-5 h-5" />
              </Button>
              <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {row.original.is_customizable && (
                <DropdownMenuItem asChild>
                  <Link href={`/products/${row.original.id}`} className="flex items-center w-full cursor-pointer">
                    <Settings2 className="w-4 h-4 mr-2" />
                    <span>Manage Customizations</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                setSelectedProduct(row.original);
                setIsEditModalOpen(true);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(row.original)}>
                {row.original.isActive === false ? (
                  <><Eye className="w-4 h-4 mr-2" /> Enable</>
                ) : (
                  <><EyeOff className="w-4 h-4 mr-2" /> Disable (hide)</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => {
                setSelectedProduct(row.original);
                setIsDeleteModalOpen(true);
              }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">Products</h1>
          <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1">Review pending items and manage the menu catalog</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/templates" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto border-zinc-200 text-swiggy-navy font-bold rounded-xl h-10 sm:h-12 gap-2 shadow-sm text-xs sm:text-sm">
              <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Manage BYO Templates</span>
              <span className="xs:hidden">Templates</span>
            </Button>
          </Link>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-4 sm:px-6 rounded-xl h-10 sm:h-12 gap-2 shadow-lg shadow-swiggy-orange/20 text-xs sm:text-sm">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-none shadow-2xl">
            <form onSubmit={handleAddProduct} className="flex flex-col min-h-0 flex-1">
              <DialogHeader className="flex-shrink-0 mb-4">
                <DialogTitle className="text-xl sm:text-2xl font-black text-swiggy-navy uppercase tracking-tight">Add New Product</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-swiggy-gray">
                  Added products will be automatically approved.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 -mr-2 sm:-mr-4 space-y-4 sm:space-y-6 py-2 border-y border-zinc-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2 space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Product Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Garlic Naan" required className="h-10 sm:h-12 rounded-xl font-bold text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="vendorName" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Vendor Name</Label>
                  <VendorCombobox
                    name="vendorName"
                    vendors={approvedVendors}
                    value={selectedVendorForAdd}
                    onChange={setSelectedVendorForAdd}
                    placeholder="Search & select vendor"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="price" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Price (₹)</Label>
                  <Input id="price" name="price" type="number" placeholder="100" min="0" required className="h-10 sm:h-12 rounded-xl font-bold text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="category" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl font-bold text-sm">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="type" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Type</Label>
                  <Select name="type" required>
                    <SelectTrigger className="h-10 sm:h-12 rounded-xl font-bold text-sm">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Veg">Veg</SelectItem>
                      <SelectItem value="Non-Veg">Non-Veg</SelectItem>
                      <SelectItem value="Vegan">Vegan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold">Product Image</Label>
                  <div 
                    className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center cursor-pointer hover:border-swiggy-orange transition-colors relative"
                    onClick={() => document.getElementById('add-image-input').click()}
                  >
                    {addImagePreview ? (
                      <img src={addImagePreview} alt="Preview" className="h-32 mx-auto object-contain rounded-lg" />
                    ) : (
                      <div className="py-4">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-zinc-100 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-zinc-400" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500">Click to upload image</p>
                        <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WEBP up to 5MB</p>
                      </div>
                    )}
                    <input 
                      id="add-image-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAddImageFile(file);
                          setAddImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                  {addImagePreview && (
                    <button type="button" className="text-xs text-red-500 font-bold mt-1" onClick={() => { setAddImageFile(null); setAddImagePreview(""); }}>Remove image</button>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2 sm:space-y-3">
                  <Label htmlFor="description" className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">Description</Label>
                  <Textarea id="description" name="description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Product details..." className="min-h-[80px] sm:min-h-[100px] rounded-xl font-bold text-sm resize-none bg-zinc-50/50" />
                </div>
                <div className="md:col-span-2 flex flex-col gap-4 border-t border-zinc-100 pt-4 sm:pt-6">
                  <div className="flex flex-col gap-3">
                    <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-swiggy-navy">Customization Type</Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                      <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-0 bg-zinc-50 sm:bg-transparent rounded-xl sm:rounded-none border border-zinc-100 sm:border-none">
                        <input type="radio" name="customizationType" value="NONE" checked={customizationType === "NONE"} onChange={() => setCustomizationType("NONE")} className="w-4 h-4 text-swiggy-orange focus:ring-swiggy-orange" />
                        <span className="text-xs sm:text-sm font-black text-swiggy-navy uppercase tracking-tight">Standard</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-0 bg-zinc-50 sm:bg-transparent rounded-xl sm:rounded-none border border-zinc-100 sm:border-none">
                        <input type="radio" name="customizationType" value="NORMAL" checked={customizationType === "NORMAL"} onChange={() => setCustomizationType("NORMAL")} className="w-4 h-4 text-swiggy-orange focus:ring-swiggy-orange" />
                        <span className="text-xs sm:text-sm font-black text-swiggy-navy uppercase tracking-tight">Add-ons &amp; Customizations</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-0 bg-zinc-50 sm:bg-transparent rounded-xl sm:rounded-none border border-zinc-100 sm:border-none">
                        <input type="radio" name="customizationType" value="BUILD_YOUR_OWN" checked={customizationType === "BUILD_YOUR_OWN"} onChange={() => setCustomizationType("BUILD_YOUR_OWN")} className="w-4 h-4 text-swiggy-orange focus:ring-swiggy-orange" />
                        <span className="text-xs sm:text-sm font-black text-swiggy-navy uppercase tracking-tight">Build Your Own</span>
                      </label>
                    </div>
                  </div>
                  
                  {customizationType === "BUILD_YOUR_OWN" && (
                    <div className="pl-6 space-y-4 border-l-2 border-swiggy-orange ml-2 mt-2">
                      {selectedVendorForAdd ? (
                        <>
                          <div className="space-y-2">
                            <Label className="font-bold text-swiggy-navy">Select Template</Label>
                            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Choose a BYO Template" />
                              </SelectTrigger>
                              <SelectContent>
                                {vendorTemplates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                                {vendorTemplates.length === 0 && (
                                  <SelectItem value="none" disabled>No templates found.</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {templateGroups.length > 0 && (
                            <div className="space-y-6 mt-4">
                              <h4 className="font-black text-swiggy-navy border-b pb-2">Populate Options</h4>
                              {templateGroups.map((group, gIdx) => (
                                <div key={group.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <div>
                                      <h5 className="font-bold text-zinc-900">{group.name}</h5>
                                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{group.selection_type} • {group.is_required ? "Required" : "Optional"}</p>
                                      <div className="flex gap-4 mt-2">
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-[9px] font-black uppercase text-amber-500">Free Units</Label>
                                          <Input type="number" value={group.free_threshold || ""} onChange={(e) => updateManualGroup(gIdx, 'free_threshold', e.target.value)} className="h-7 w-20 text-xs font-bold" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <Label className="text-[9px] font-black uppercase text-amber-500">Extra Price (₹)</Label>
                                          <Input type="number" value={group.extra_price || ""} onChange={(e) => updateManualGroup(gIdx, 'extra_price', e.target.value)} className="h-7 w-20 text-xs font-bold" />
                                        </div>
                                      </div>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addOptionToGroup(gIdx)} className="h-7 text-xs font-bold bg-white">
                                      <Plus className="w-3 h-3 mr-1" /> Add Item
                                    </Button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {group.options.map((opt, oIdx) => (
                                      <div key={opt.id} className="flex items-start gap-2 bg-white p-2 border border-zinc-100 rounded-lg">
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                          <Input placeholder="Item Name (e.g. Cheese)" value={opt.name} onChange={(e) => updateOption(gIdx, oIdx, 'name', e.target.value)} className="h-8 text-sm" />
                                          <Input type="number" placeholder="Price (₹)" value={opt.price_modifier} onChange={(e) => updateOption(gIdx, oIdx, 'price_modifier', e.target.value)} className="h-8 text-sm" />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeOption(gIdx, oIdx)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    {group.options.length === 0 && (
                                      <p className="text-xs text-zinc-400 font-medium italic">No items added to this group yet.</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-zinc-500 font-medium italic">Please select a Vendor first to see available templates.</p>
                      )}
                    </div>
                  )}

                  {customizationType === "NORMAL" && (
                    <div className="pl-6 space-y-6 border-l-2 border-swiggy-orange ml-2 mt-2">
                      {/* Add-ons — flat paid extras (Swiggy "Make it a meal") */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div>
                            <h4 className="font-black text-swiggy-navy">Add-ons</h4>
                            <p className="text-[10px] text-zinc-500 font-medium">Optional paid extras, e.g. Extra Cheese +₹30</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addAddon} className="h-8 font-bold border-dashed text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Add Add-on
                          </Button>
                        </div>
                        {addOns.length === 0 ? (
                          <p className="text-xs text-zinc-400 font-medium italic">No add-ons yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {addOns.map((a, idx) => (
                              <div key={a.id} className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-2">
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-zinc-400">Name</Label>
                                    <Input value={a.name} onChange={(e) => updateAddon(idx, 'name', e.target.value)} placeholder="Extra Cheese" className="h-8 text-sm bg-white" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-zinc-400">Price (₹)</Label>
                                    <Input type="number" value={a.price} onChange={(e) => updateAddon(idx, 'price', e.target.value)} placeholder="30" className="h-8 text-sm bg-white" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-zinc-400">Free Units</Label>
                                    <Input type="number" value={a.free_limit} onChange={(e) => updateAddon(idx, 'free_limit', e.target.value)} placeholder="0" className="h-8 text-sm bg-white" />
                                  </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeAddon(idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Customization groups — required/optional choice sets */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h4 className="font-black text-swiggy-navy">Customization Groups</h4>
                          <p className="text-[10px] text-zinc-500 font-medium">Choice sets, e.g. Size (pick one) or Toppings (pick many)</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addManualGroup} className="h-8 font-bold border-dashed text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add Group
                        </Button>
                      </div>
                      
                      <div className="space-y-6">
                        {templateGroups.map((group, gIdx) => (
                          <div key={group.id || gIdx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 relative group/item">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 h-8 w-8 text-red-400 hover:text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity"
                              onClick={() => removeManualGroup(gIdx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            <div className="grid grid-cols-2 gap-4 pr-8 mb-4">
                              <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold">Group Name</Label>
                                <Input value={group.name} onChange={(e) => updateManualGroup(gIdx, 'name', e.target.value)} placeholder="e.g. Size" className="bg-white h-8 text-sm" />
                              </div>
                              <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold">Selection Type</Label>
                                <Select value={group.selection_type} onValueChange={(v) => updateManualGroup(gIdx, 'selection_type', v)}>
                                  <SelectTrigger className="bg-white h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SINGLE">Single Select</SelectItem>
                                    <SelectItem value="MULTIPLE">Multi Select</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 col-span-2 md:col-span-1 flex items-center gap-2 mt-2">
                                <input 
                                  type="checkbox" 
                                  id={`req-${gIdx}`} 
                                  checked={group.is_required} 
                                  onChange={(e) => updateManualGroup(gIdx, 'is_required', e.target.checked)} 
                                  className="w-4 h-4 rounded border-zinc-300 text-swiggy-orange focus:ring-swiggy-orange" 
                                />
                                <Label htmlFor={`req-${gIdx}`} className="font-bold text-xs cursor-pointer">Is Required?</Label>
                              </div>
                              <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold text-amber-500">Free Units</Label>
                                <Input 
                                  type="number" 
                                  value={group.free_threshold || ""} 
                                  onChange={(e) => updateManualGroup(gIdx, 'free_threshold', e.target.value)} 
                                  placeholder="0" 
                                  className="bg-white h-8 text-sm" 
                                />
                              </div>
                              <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold text-amber-500">Extra Price (₹)</Label>
                                <Input 
                                  type="number" 
                                  value={group.extra_price || ""} 
                                  onChange={(e) => updateManualGroup(gIdx, 'extra_price', e.target.value)} 
                                  placeholder="0" 
                                  className="bg-white h-8 text-sm" 
                                />
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-zinc-100">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-bold text-swiggy-gray uppercase">Items</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={() => addOptionToGroup(gIdx)} className="h-6 text-[10px] font-bold text-swiggy-orange hover:text-swiggy-orange/80 hover:bg-orange-50">
                                  <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {group.options.map((opt, oIdx) => (
                                  <div key={opt.id} className="flex items-start gap-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <Input placeholder="Item Name" value={opt.name} onChange={(e) => updateOption(gIdx, oIdx, 'name', e.target.value)} className="h-8 text-xs" />
                                      <Input type="number" placeholder="Price (₹)" value={opt.price_modifier} onChange={(e) => updateOption(gIdx, oIdx, 'price_modifier', e.target.value)} className="h-8 text-xs" />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeOption(gIdx, oIdx)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                {group.options.length === 0 && (
                                  <p className="text-[10px] text-zinc-400 font-medium italic">No items added to this group yet.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {templateGroups.length === 0 && (
                          <div className="text-center p-6 border-2 border-dashed border-zinc-200 rounded-xl">
                            <p className="text-zinc-500 font-medium text-sm">No custom groups added yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 pt-2">
                <Button type="button" variant="ghost" className="font-bold" onClick={() => { setIsAddModalOpen(false); setAddImageFile(null); setAddImagePreview(""); }}>Cancel</Button>
                <Button type="submit" disabled={uploading} className="bg-swiggy-orange hover:bg-swiggy-orange/90 font-black px-8">{uploading ? "Saving..." : "Save Product"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if(!open) setSelectedProduct(null);
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          {selectedProduct && (
            <form onSubmit={handleEditProduct} className="flex flex-col min-h-0 flex-1">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-2xl font-black text-swiggy-navy">Edit Product</DialogTitle>
                <DialogDescription className="font-medium text-swiggy-gray">
                  Modify details for {selectedProduct.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6 border-y border-zinc-100 my-4 overflow-y-auto flex-1 pr-1">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="edit-name" className="font-bold">Product Name</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedProduct.name} required />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Vendor Name</Label>
                  <Input value={selectedProduct.vendorName} disabled className="bg-zinc-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="font-bold">Price (₹)</Label>
                  <Input id="edit-price" name="price" type="number" defaultValue={selectedProduct.price} min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="font-bold">Category</Label>
                  <Select name="category" defaultValue={selectedProduct.category} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const names = categoryOptions.map((c) => c.name);
                        // Keep the product's existing category selectable even if it was
                        // since disabled or predates the managed list.
                        if (selectedProduct.category && !names.includes(selectedProduct.category)) {
                          names.unshift(selectedProduct.category);
                        }
                        return names.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type" className="font-bold">Type</Label>
                  <Select name="type" defaultValue={selectedProduct.type} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Veg">Veg</SelectItem>
                      <SelectItem value="Non-Veg">Non-Veg</SelectItem>
                      <SelectItem value="Vegan">Vegan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold">Product Image</Label>
                  <div 
                    className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center cursor-pointer hover:border-swiggy-orange transition-colors"
                    onClick={() => document.getElementById('edit-image-input').click()}
                  >
                    {editImagePreview || selectedProduct?.imageUrl ? (
                      <img src={editImagePreview || selectedProduct?.imageUrl} alt="Preview" className="h-32 mx-auto object-contain rounded-lg" />
                    ) : (
                      <div className="py-4">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-zinc-100 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-zinc-400" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500">Click to upload image</p>
                        <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WEBP up to 5MB</p>
                      </div>
                    )}
                    <input 
                      id="edit-image-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditImageFile(file);
                          setEditImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                  {(editImagePreview) && (
                    <button type="button" className="text-xs text-red-500 font-bold mt-1" onClick={() => { setEditImageFile(null); setEditImagePreview(""); }}>Remove new image</button>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="edit-description" className="font-bold">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={selectedProduct.description} placeholder="Product details..." />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="edit-is_customizable" name="is_customizable" defaultChecked={selectedProduct.is_customizable} className="w-4 h-4 rounded border-zinc-300 text-swiggy-orange focus:ring-swiggy-orange" />
                  <Label htmlFor="edit-is_customizable" className="font-bold">Is Customizable (Build Your Own)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" className="font-bold" onClick={() => { setIsEditModalOpen(false); setEditImageFile(null); setEditImagePreview(""); }}>Cancel</Button>
                <Button type="submit" disabled={uploading} className="bg-swiggy-orange hover:bg-swiggy-orange/90 font-black px-8">{uploading ? "Saving..." : "Update Product"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        setIsDeleteModalOpen(open);
        if(!open) setSelectedProduct(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Delete Product</DialogTitle>
            <DialogDescription className="font-medium text-swiggy-gray mt-2">
              Are you sure you want to delete <strong className="text-zinc-900">{selectedProduct?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" className="font-bold" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" className="font-black px-8" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters & Table Area */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiggy-gray" />
            <Input 
              placeholder="Search by product or vendor name..." 
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

        <div className="responsive-table-container mt-6">
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
              {table.getRowModel().rows.length ? (
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
                    No products found matching your criteria.
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

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-transparent border-none shadow-none" showCloseButton={false}>
          <DialogTitle className="sr-only">Product Image Preview</DialogTitle>
          <DialogDescription className="sr-only">
            A high-resolution preview of the product image.
          </DialogDescription>
          <div className="relative group">
            <img 
              src={viewingImage} 
              alt="Product Preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl" 
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
          </div>
          <p className="text-center text-white font-medium mt-4 bg-black/50 backdrop-blur-md py-2 px-4 rounded-full w-fit mx-auto">
            Product Image Preview
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
