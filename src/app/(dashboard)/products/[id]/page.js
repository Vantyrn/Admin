"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronRight, 
  ArrowUp, ArrowDown, Package, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomizationManagerPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id;

  const [product, setProduct] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Modal States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'group' | 'option', id: string }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, groupsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/products/${productId}/customizations`)
      ]);

      if (!prodRes.ok) throw new Error("Failed to fetch product");
      if (!groupsRes.ok) throw new Error("Failed to fetch customizations");

      const prodData = await prodRes.json();
      const groupsData = await groupsRes.json();

      setProduct(prodData);
      setGroups(groupsData);
      setExpandedGroups(new Set(groupsData.map(g => g.id))); // Expand all by default
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const toggleGroup = (id) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGroups(newExpanded);
  };

  const handleMoveGroup = async (index, direction) => {
    if (
      (direction === -1 && index === 0) || 
      (direction === 1 && index === groups.length - 1)
    ) return;

    const newGroups = [...groups];
    // Swap
    const temp = newGroups[index];
    newGroups[index] = newGroups[index + direction];
    newGroups[index + direction] = temp;

    // Update sort_orders visually
    const reorderedGroups = newGroups.map((g, i) => ({ ...g, sort_order: i }));
    setGroups(reorderedGroups);

    // Persist to backend
    try {
      const res = await fetch("/api/option-groups/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: reorderedGroups.map(g => ({ id: g.id, sort_order: g.sort_order }))
        })
      });
      if (!res.ok) throw new Error("Failed to reorder groups");
      toast.success("Order updated");
    } catch (err) {
      toast.error(err.message);
      fetchData(); // Revert on failure
    }
  };

  // Forms
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      product_id: productId,
      name: formData.get("name"),
      selection_type: formData.get("selection_type"),
      is_required: formData.get("is_required") === "true",
      max_limit: formData.get("max_limit") || null
    };

    try {
      let res;
      if (editingGroup) {
        payload.id = editingGroup.id;
        res = await fetch("/api/option-groups", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/option-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error("Failed to save group");
      toast.success(editingGroup ? "Group updated" : "Group created");
      setIsGroupModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOptionSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      group_id: activeGroupId,
      name: formData.get("name"),
      price_modifier: formData.get("price_modifier") || 0,
      is_available: formData.get("is_active") === "true"
    };

    try {
      let res;
      if (editingOption) {
        payload.id = editingOption.id;
        res = await fetch("/api/product-options", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/product-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error("Failed to save option");
      toast.success(editingOption ? "Option updated" : "Option created");
      setIsOptionModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const endpoint = itemToDelete.type === 'group' ? '/api/option-groups' : '/api/product-options';
      const res = await fetch(`${endpoint}?id=${itemToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success("Deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approveProduct = async () => {
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, status: "approved" })
      });
      if (!res.ok) throw new Error("Failed to approve product");
      toast.success("Product approved for sale");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!product) return <div>Product not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <Button 
        variant="ghost" 
        onClick={() => router.push("/products")}
        className="font-bold gap-2 text-swiggy-gray hover:text-swiggy-navy -ml-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Button>

      {/* Header Info */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-5">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-xl object-cover border-2 border-zinc-50" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-zinc-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-swiggy-navy">{product.name}</h1>
              {product.status === "PENDING_REVIEW" && (
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 uppercase text-[10px] font-bold">Pending Review</Badge>
              )}
              {product.status === "APPROVED" && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 uppercase text-[10px] font-bold">Approved</Badge>
              )}
            </div>
            <p className="text-sm font-medium text-swiggy-gray mb-2">Vendor: {product.vendorName} • Base Price: ₹{product.base_price}</p>
            <Badge variant="outline" className="border-swiggy-orange text-swiggy-orange bg-orange-50 font-bold">
              {groups.some(g => g.id === "virtual-addons-group") ? "Direct Add-ons Configurator" : "Build Your Own Configurator"}
            </Badge>
          </div>
        </div>
        
        {product.status === "PENDING_REVIEW" && (
          <Button onClick={approveProduct} className="bg-green-600 hover:bg-green-700 text-white font-black px-6 rounded-xl h-12 shadow-lg shadow-green-600/20">
            Approve Product
          </Button>
        )}
      </div>

      {/* Customization Tree */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-swiggy-navy">Customization Groups</h2>
          <Button 
            onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-950 border border-zinc-100 border-dashed rounded-3xl">
            <AlertCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-swiggy-navy mb-1">No customizations yet</h3>
            <p className="text-sm text-swiggy-gray font-medium">Add your first option group to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, index) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div key={group.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all">
                  {/* Group Header */}
                  <div className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 group">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleGroup(group.id)}>
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 shadow-sm transition-transform">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          {group.name}
                          {group.is_required && <span className="text-[10px] uppercase font-black tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Required</span>}
                        </h3>
                        <p className="text-xs font-medium text-zinc-500 mt-1">
                          {group.selection_type === "SINGLE" ? "Single Select" : "Multi Select"} 
                          {group.max_selections && ` • Max: ${group.max_selections}`}
                        </p>
                      </div>
                    </div>
                    {group.id === "virtual-addons-group" ? (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px] font-bold">Direct Add-ons (Read Only)</Badge>
                    ) : (
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" disabled={index === 0} onClick={() => handleMoveGroup(index, -1)}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" disabled={index === groups.length - 1} onClick={() => handleMoveGroup(index, 1)}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-swiggy-orange hover:text-swiggy-orange hover:bg-orange-50" onClick={() => { setEditingGroup(group); setIsGroupModalOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setItemToDelete({ type: 'group', id: group.id }); setIsDeleteModalOpen(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  {isExpanded && (
                    <div className="p-4 md:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white">
                      <div className="space-y-2 mb-4">
                        {group.product_customization_options?.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-swiggy-orange/30 hover:bg-orange-50/10 transition-colors group/opt">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${option.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={`font-bold text-sm ${!option.is_available && 'text-zinc-400 line-through'}`}>{option.name}</span>
                              {Number(option.price_modifier) > 0 && (
                                <Badge variant="secondary" className="font-bold text-zinc-600 bg-zinc-100">+ ₹{option.price_modifier}</Badge>
                              )}
                            </div>
                            {group.id !== "virtual-addons-group" && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900" onClick={() => { setActiveGroupId(group.id); setEditingOption(option); setIsOptionModalOpen(true); }}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => { setItemToDelete({ type: 'option', id: option.id }); setIsDeleteModalOpen(true); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {group.id !== "virtual-addons-group" && (
                        <Button 
                          variant="outline" 
                          className="w-full border-dashed border-zinc-300 text-zinc-500 hover:border-swiggy-orange hover:text-swiggy-orange font-bold h-10"
                          onClick={() => { setActiveGroupId(group.id); setEditingOption(null); setIsOptionModalOpen(true); }}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Option
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleGroupSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{editingGroup ? "Edit Group" : "Add Option Group"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <Label className="font-bold">Group Name</Label>
                <Input name="name" defaultValue={editingGroup?.name} placeholder="e.g. Choose your Crust" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Selection Type</Label>
                  <Select name="selection_type" defaultValue={editingGroup?.selection_type || "SINGLE"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single Select (Radio)</SelectItem>
                      <SelectItem value="MULTI">Multi Select (Checkbox)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Requirement</Label>
                  <Select name="is_required" defaultValue={editingGroup?.is_required ? "true" : "false"} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Required</SelectItem>
                      <SelectItem value="false">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-zinc-600">Max Selection Limit (Optional)</Label>
                <Input name="max_limit" type="number" defaultValue={editingGroup?.max_selections || ""} placeholder="e.g. 3" min="1" />
                <p className="text-[10px] text-zinc-400 font-medium">Leave empty for unlimited. Only applies to Multi Select.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsGroupModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-zinc-900 text-white font-bold px-6">{editingGroup ? "Save Changes" : "Create Group"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Option Modal */}
      <Dialog open={isOptionModalOpen} onOpenChange={setIsOptionModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleOptionSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{editingOption ? "Edit Option" : "Add Option"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <Label className="font-bold">Option Name</Label>
                <Input name="name" defaultValue={editingOption?.name} placeholder="e.g. Extra Cheese" required />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Price Modifier (₹)</Label>
                <Input name="price_modifier" type="number" step="0.01" defaultValue={editingOption?.price_modifier || ""} placeholder="e.g. 20" />
                <p className="text-[10px] text-zinc-400 font-medium">Extra cost added to the base price.</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Availability</Label>
                <Select name="is_active" defaultValue={editingOption ? String(editingOption.is_available) : "true"} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">In Stock (Active)</SelectItem>
                    <SelectItem value="false">Out of Stock (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOptionModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-bold px-6">{editingOption ? "Save Changes" : "Add Option"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">Confirm Deletion</DialogTitle>
            <DialogDescription className="font-medium text-swiggy-gray mt-2">
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" className="font-bold" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" className="font-black px-8" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
