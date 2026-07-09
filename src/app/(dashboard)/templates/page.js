"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Eye, EyeOff, ChevronDown, ChevronRight, Package, ArrowLeft, Users } from "lucide-react";
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
import Link from "next/link";
import { useRealtime } from "@/hooks/use-realtime";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { data: vendors } = useRealtime("/api/vendors");

  // Admin-managed business categories for the template category dropdown.
  const [categoryOptions, setCategoryOptions] = useState([]);
  useEffect(() => {
    let active = true;
    fetch("/api/categories?active=1")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (active) setCategoryOptions(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [assignSearch, setAssignSearch] = useState("");

  // For the builder inside the modal
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [groups, setGroups] = useState([]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/byo-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openAddModal = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateCategory("");
    setTemplateDescription("");
    setGroups([]);
    setIsTemplateModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateCategory(template.category || "");
    setTemplateDescription(template.description || "");
    setGroups((template.byo_template_groups || []).map(g => ({
      ...g,
      options: (g.byo_template_options || []).map(o => ({
        id: o.id,
        name: o.name,
        price_modifier: o.price_modifier ?? "",
        is_available: o.is_available !== false,
      })),
    })));
    setIsTemplateModalOpen(true);
  };

  const openAssignModal = (template) => {
    setAssigningTemplate(template);
    const assignedIds = template.vendor_assigned_templates?.map(a => a.vendors?.id) || [];
    setSelectedVendors(assignedIds);
    setAssignSearch("");
    setIsAssignModalOpen(true);
  };

  const handleAddGroup = () => {
    setGroups([...groups, {
      id: Date.now().toString(),
      name: "",
      selection_type: "SINGLE",
      is_required: false,
      max_limit: null,
      free_threshold: 0,
      extra_price: 0,
      options: []
    }]);
  };

  const updateGroup = (index, field, value) => {
    const newGroups = [...groups];
    newGroups[index][field] = value;
    setGroups(newGroups);
  };

  const removeGroup = (index) => {
    const newGroups = [...groups];
    newGroups.splice(index, 1);
    setGroups(newGroups);
  };

  // Options within a template group (the actual choices, e.g. Cheese / Lettuce)
  const addOption = (groupIndex) => {
    const newGroups = [...groups];
    if (!newGroups[groupIndex].options) newGroups[groupIndex].options = [];
    newGroups[groupIndex].options.push({ id: `${Date.now()}-${Math.round(performance.now())}`, name: "", price_modifier: "", is_available: true });
    setGroups(newGroups);
  };

  const updateOption = (groupIndex, optIndex, field, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].options[optIndex][field] = value;
    setGroups(newGroups);
  };

  const removeOption = (groupIndex, optIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].options.splice(optIndex, 1);
    setGroups(newGroups);
  };

  const handleSaveTemplate = async () => {
    if (!templateName) return toast.error("Template name is required");
    if (groups.some(g => !g.name)) return toast.error("All groups must have a name");

    try {
      const payload = {
        id: editingTemplate?.id,
        name: templateName,
        category: templateCategory,
        description: templateDescription,
        groups: groups.map((g, i) => ({
          name: g.name,
          selection_type: g.selection_type,
          is_required: Boolean(g.is_required),
          max_limit: g.max_limit ? Number(g.max_limit) : null,
          free_threshold: g.free_threshold ? Number(g.free_threshold) : 0,
          extra_price: g.extra_price ? Number(g.extra_price) : 0,
          display_order: i,
          options: (g.options || []).map((o, oi) => ({
            name: o.name,
            price_modifier: Number(o.price_modifier) || 0,
            is_available: o.is_available !== false,
            display_order: oi,
          }))
        }))
      };

      let res;
      if (editingTemplate) {
        res = await fetch(`/api/byo-templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/byo-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to save template");
      toast.success(editingTemplate ? "Template updated" : "Template created");
      setIsTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssign = async () => {
    try {
      const res = await fetch("/api/byo-templates/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: assigningTemplate.id,
          vendor_ids: selectedVendors
        })
      });
      if (!res.ok) throw new Error("Failed to assign templates");
      toast.success("Templates assigned successfully");
      setIsAssignModalOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/byo-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      toast.success("Template deleted");
      fetchTemplates();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Approve / reject / enable / disable a (vendor-authored) template.
  const moderateTemplate = async (id, payload, successMsg) => {
    try {
      const res = await fetch(`/api/byo-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Action failed");
      toast.success(successMsg);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approveTemplate = (t) => moderateTemplate(t.id, { status: "approved", isActive: true, rejectionReason: null }, "Template approved");
  const rejectTemplate = (t) => {
    const reason = window.prompt("Reason for rejecting this template (shown to the vendor):", "");
    if (reason === null) return;
    moderateTemplate(t.id, { status: "rejected", rejectionReason: reason || "Not specified" }, "Template rejected");
  };
  const toggleTemplateActive = (t) =>
    moderateTemplate(t.id, { isActive: !t.is_active }, t.is_active ? "Template disabled" : "Template enabled");

  // Only approved/active vendors are assignable; filter further by the search box.
  const assignQuery = assignSearch.trim().toLowerCase();
  const assignableVendors = (vendors || [])
    .filter((v) => ["APPROVED", "ACTIVE"].includes(v.status))
    .filter(
      (v) =>
        !assignQuery ||
        (v.businessName || "").toLowerCase().includes(assignQuery) ||
        (v.ownerName || "").toLowerCase().includes(assignQuery)
    );

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-swiggy-gray hover:text-swiggy-navy">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">BYO Templates</h1>
            <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-0.5 sm:mt-1">Manage global customization structures.</p>
          </div>
        </div>
        <div className="sm:ml-auto w-full sm:w-auto">
          <Button onClick={openAddModal} className="w-full sm:w-auto bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-6 rounded-xl h-10 sm:h-12 gap-2 shadow-lg shadow-swiggy-orange/20 text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col hover:border-swiggy-orange/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-black text-swiggy-navy truncate">{template.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider">{template.category || "General"}</Badge>
                  {template.vendors ? (
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-[9px] uppercase tracking-wider">By {template.vendors.business_name}</Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 font-bold text-[9px] uppercase tracking-wider">Admin</Badge>
                  )}
                  {template.status === "pending_review" && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[9px] uppercase tracking-wider">Pending Review</Badge>
                  )}
                  {template.status === "approved" && template.vendors && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[9px] uppercase tracking-wider">Approved</Badge>
                  )}
                  {template.status === "rejected" && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 font-bold text-[9px] uppercase tracking-wider">Rejected</Badge>
                  )}
                  {template.is_active === false && (
                    <Badge className="bg-zinc-200 text-zinc-600 border-zinc-300 font-bold text-[9px] uppercase tracking-wider">Disabled</Badge>
                  )}
                </div>
                {template.status === "rejected" && template.rejection_reason && (
                  <p className="text-[10px] text-red-500 font-medium mt-1.5">Reason: {template.rejection_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-swiggy-orange hover:bg-orange-50" onClick={() => openEditModal(template)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 mb-6">
              <h4 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Groups ({template.byo_template_groups?.length || 0})</h4>
              {template.byo_template_groups?.slice(0,3).map(g => (
                <div key={g.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                  <span className="font-bold text-zinc-700">{g.name}</span>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-black">{g.selection_type}</span>
                </div>
              ))}
              {(template.byo_template_groups?.length || 0) > 3 && (
                <div className="text-[10px] sm:text-xs text-center text-zinc-400 font-bold uppercase tracking-wider">+ {(template.byo_template_groups?.length || 0) - 3} more groups</div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-zinc-100 space-y-3">
              {/* Moderation actions. Approve/Reject apply only to vendor-authored templates
                  awaiting review; Enable/Disable applies to EVERY template (admin-created and
                  approved vendor-created alike). */}
              <div className="flex flex-wrap items-center gap-2">
                {template.vendors && (template.status === "pending_review" || template.status === "rejected") ? (
                  <>
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] sm:text-xs h-8" onClick={() => approveTemplate(template)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    {template.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="flex-1 text-red-500 border-red-100 hover:bg-red-50 font-bold text-[10px] sm:text-xs h-8" onClick={() => rejectTemplate(template)}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" variant="outline" className={`flex-1 font-bold text-[10px] sm:text-xs h-8 ${template.is_active ? "text-amber-600 border-amber-100 hover:bg-amber-50" : "text-green-600 border-green-100 hover:bg-green-50"}`} onClick={() => toggleTemplateActive(template)}>
                    {template.is_active ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Disable</> : <><Eye className="w-3.5 h-3.5 mr-1" /> Enable</>}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs sm:text-sm font-medium text-zinc-600">
                  Assigned to <strong className="text-swiggy-navy">{template.vendor_assigned_templates?.length || 0}</strong> vendors
                </div>
                <Button variant="outline" size="sm" className="font-bold border-swiggy-orange text-swiggy-orange hover:bg-orange-50 text-[10px] sm:text-xs px-2 sm:px-3 h-8 sm:h-9" onClick={() => openAssignModal(template)}>
                  Assign
                </Button>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-black text-swiggy-navy">No templates yet</h3>
            <p className="text-xs sm:text-sm text-swiggy-gray mt-2">Create your first BYO template to get started.</p>
          </div>
        )}
      </div>

      {/* Template Builder Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          <DialogHeader className="p-6 sm:p-8 border-b border-zinc-100 shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-black text-swiggy-navy uppercase">{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-swiggy-gray">Global customization structure</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Template Name</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Burger Options" className="h-10 sm:h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger className="h-10 sm:h-11 rounded-xl font-bold text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(() => {
                      const names = categoryOptions.map((c) => c.name);
                      // Keep the template's current category selectable even if it was
                      // since disabled or predates the managed list.
                      if (templateCategory && !names.includes(templateCategory)) {
                        names.unshift(templateCategory);
                      }
                      return names.length === 0
                        ? <SelectItem value="General">General</SelectItem>
                        : names.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-swiggy-gray">Template Description (Auto-fills product details)</Label>
              <Input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="e.g. Delicious custom-built burger with your choice of premium ingredients." className="h-10 sm:h-11 rounded-xl" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                <Label className="text-xs font-black uppercase tracking-widest text-swiggy-navy">Option Groups</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddGroup} className="h-7 text-[10px] font-black text-swiggy-orange hover:bg-orange-50 uppercase tracking-widest">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Group
                </Button>
              </div>

              <div className="space-y-4">
                {groups.map((group, index) => (
                  <div key={group.id || index} className="p-4 border border-zinc-200 rounded-2xl bg-zinc-50 relative group/item">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 text-red-400 hover:text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      onClick={() => removeGroup(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Group Name</Label>
                        <Input value={group.name} onChange={(e) => updateGroup(index, 'name', e.target.value)} placeholder="e.g. Toppings" className="bg-white h-9 text-sm rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Selection Type</Label>
                        <Select value={group.selection_type} onValueChange={(v) => updateGroup(index, 'selection_type', v)}>
                          <SelectTrigger className="bg-white h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="SINGLE" className="text-xs font-bold">Single Select</SelectItem>
                            <SelectItem value="MULTIPLE" className="text-xs font-bold">Multi Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:col-span-2">
                        <input
                          type="checkbox"
                          id={`req-${index}`}
                          checked={group.is_required}
                          onChange={(e) => updateGroup(index, 'is_required', e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 text-swiggy-orange focus:ring-swiggy-orange"
                        />
                        <Label htmlFor={`req-${index}`} className="text-xs font-bold cursor-pointer text-zinc-600">Required Selection</Label>
                      </div>
                    </div>

                    {/* Options inside this group — the actual choices the customer picks */}
                    <div className="mt-4 bg-white rounded-xl border border-zinc-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Options</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addOption(index)} className="h-6 text-[10px] font-black text-swiggy-orange hover:bg-orange-50 uppercase tracking-widest">
                          <Plus className="w-3 h-3 mr-1" /> Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(group.options || []).map((opt, oIdx) => (
                          <div key={opt.id || oIdx} className="flex items-center gap-2">
                            <Input value={opt.name} onChange={(e) => updateOption(index, oIdx, 'name', e.target.value)} placeholder="Option name (e.g. Cheese)" className="h-8 text-xs bg-white flex-1 rounded-lg" />
                            <Input type="number" value={opt.price_modifier} onChange={(e) => updateOption(index, oIdx, 'price_modifier', e.target.value)} placeholder="+₹" className="h-8 text-xs bg-white w-20 rounded-lg" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeOption(index, oIdx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {(group.options || []).length === 0 && (
                          <p className="text-[10px] text-zinc-400 font-medium italic">No options yet — add the choices customers can pick.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-zinc-100 rounded-2xl">
                    <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest italic">No groups defined yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 sm:p-8 bg-zinc-50 border-t border-zinc-100 shrink-0 gap-2">
            <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="flex-1 sm:flex-none font-bold">Cancel</Button>
            <Button onClick={handleSaveTemplate} className="flex-1 sm:flex-none bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-8 h-10 sm:h-12 rounded-xl text-xs sm:text-sm uppercase tracking-widest">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          <DialogHeader className="p-6 sm:p-8 border-b border-zinc-50 shrink-0">
            <DialogTitle className="text-xl font-black text-swiggy-navy uppercase">Assign Template</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-swiggy-gray mt-1">
              Enable for specific vendors
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 sm:px-6 pt-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <Input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search approved vendors..."
                className="h-10 rounded-xl text-sm font-bold"
              />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {selectedVendors.length} selected · {assignableVendors.length} shown
            </p>
          </div>
          <div className="p-4 sm:p-6 pt-3 space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {assignableVendors.length > 0 ? assignableVendors.map(vendor => (
              <label key={vendor.id} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-all group">
                <input
                  type="checkbox"
                  checked={selectedVendors.includes(vendor.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedVendors([...selectedVendors, vendor.id]);
                    else setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                  }}
                  className="w-5 h-5 rounded-md border-zinc-300 text-swiggy-orange focus:ring-swiggy-orange"
                />
                <div className="flex flex-col">
                  <span className="font-black text-swiggy-navy group-hover:text-swiggy-orange transition-colors">{vendor.businessName}</span>
                  <span className="text-[10px] font-bold text-swiggy-gray uppercase tracking-widest">{vendor.ownerName}</span>
                </div>
              </label>
            )) : (
              <div className="text-center py-10 opacity-20">
                 <Users className="w-12 h-12 mx-auto mb-2" />
                 <p className="text-sm font-black uppercase tracking-tighter">{assignQuery ? "No matching vendors" : "No approved vendors"}</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 sm:p-8 bg-zinc-50 border-t border-zinc-100 shrink-0 gap-2">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)} className="flex-1 sm:flex-none font-bold">Cancel</Button>
            <Button onClick={handleAssign} className="flex-1 sm:flex-none bg-swiggy-navy hover:bg-swiggy-navy/90 text-white font-black px-8 h-10 sm:h-12 rounded-xl text-xs sm:text-sm uppercase tracking-widest">Update Assignments</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
