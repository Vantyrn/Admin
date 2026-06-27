"use client";

import React, { useState, useEffect } from "react";
import {
  Tags,
  Plus,
  Edit,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Utensils,
  ShoppingBag,
  Search,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState(null);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null → creating; object → editing
  const [form, setForm] = useState({ name: "", isFood: true });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      setCategories(await res.json());
    } catch (e) {
      toast.error(e.message);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", isFood: true });
    setIsFormOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, isFood: cat.isFood });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Category name is required.");
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), isFood: form.isFood }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");
      toast.success(editing ? "Category updated" : "Category created");
      setIsFormOpen(false);
      fetchCategories();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // "Drop" = soft disable via DELETE; re-enable via PATCH isActive=true.
  const toggleActive = async (cat) => {
    setBusyId(cat.id);
    try {
      const res = cat.isActive
        ? await fetch(`/api/categories/${cat.id}`, { method: "DELETE" })
        : await fetch(`/api/categories/${cat.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");
      toast.success(cat.isActive ? `"${cat.name}" disabled` : `"${cat.name}" enabled`);
      fetchCategories();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  // Reorder by swapping display_order with the adjacent row (only when not filtering).
  const move = async (cat, dir) => {
    const list = [...(categories || [])];
    const idx = list.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const other = list[swapIdx];
    setBusyId(cat.id);
    try {
      await Promise.all([
        fetch(`/api/categories/${cat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: other.displayOrder }),
        }),
        fetch(`/api/categories/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: cat.displayOrder }),
        }),
      ]);
      fetchCategories();
    } catch (e) {
      toast.error("Failed to reorder");
    } finally {
      setBusyId(null);
    }
  };

  const loading = categories === null;
  const filtered = (categories || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const total = categories?.length || 0;
  const activeCount = (categories || []).filter((c) => c.isActive).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-swiggy-orange/10 border border-swiggy-orange/20 flex items-center justify-center shrink-0">
            <Tags className="w-6 h-6 text-swiggy-orange" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">
              Business Categories
            </h1>
            <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1">
              Manage the cuisine / store types vendors choose during registration.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-swiggy-orange hover:bg-swiggy-orange/95 text-white font-black px-6 h-11 rounded-xl shadow-lg shadow-swiggy-orange/10 flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Stats + search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex gap-3">
          <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 font-bold px-3 py-1.5 rounded-lg">
            {total} total
          </Badge>
          <Badge className="bg-green-100 text-green-700 border-green-200 font-bold px-3 py-1.5 rounded-lg">
            {activeCount} active
          </Badge>
          <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 font-bold px-3 py-1.5 rounded-lg">
            {total - activeCount} disabled
          </Badge>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9 rounded-xl border-zinc-200 font-medium"
          />
        </div>
      </div>

      <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Tags className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-zinc-400 italic">
                {search ? "No categories match your search." : "No categories yet. Add one to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-6 py-4 w-24">Order</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Name</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Type</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cat, i) => (
                    <TableRow key={cat.id} className={`border-zinc-50 ${!cat.isActive ? "opacity-60" : ""}`}>
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-zinc-400 hover:text-swiggy-orange disabled:opacity-30"
                            disabled={!!search || i === 0 || busyId === cat.id}
                            onClick={() => move(cat, "up")}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-zinc-400 hover:text-swiggy-orange disabled:opacity-30"
                            disabled={!!search || i === filtered.length - 1 || busyId === cat.id}
                            onClick={() => move(cat, "down")}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-sm text-swiggy-navy">{cat.name}</TableCell>
                      <TableCell>
                        {cat.isFood ? (
                          <Badge className="bg-orange-50 text-orange-600 border-orange-100 font-bold text-[10px] uppercase tracking-wider gap-1">
                            <Utensils className="w-3 h-3" /> Food
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 font-bold text-[10px] uppercase tracking-wider gap-1">
                            <ShoppingBag className="w-3 h-3" /> Non-Food
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cat.isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-[10px] uppercase tracking-wider">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 font-bold text-[10px] uppercase tracking-wider">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg font-bold border-zinc-200 gap-1.5"
                            onClick={() => openEdit(cat)}
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === cat.id}
                            className={`h-9 rounded-lg font-bold gap-1.5 ${
                              cat.isActive
                                ? "text-red-500 border-red-100 hover:bg-red-50"
                                : "text-green-600 border-green-100 hover:bg-green-50"
                            }`}
                            onClick={() => toggleActive(cat)}
                          >
                            {cat.isActive ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Drop
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Enable
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-swiggy-navy flex items-center gap-2">
              <Tags className="w-5 h-5 text-swiggy-orange" />
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription className="font-medium">
              {editing
                ? "Update this business category. Renaming does not change vendors already registered under the old name."
                : "Create a new business category vendors can choose during registration."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-2">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray">Category Name</Label>
                <Input
                  autoFocus
                  placeholder="e.g. Biryani & Rice"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-12 rounded-xl border-zinc-200 font-bold focus:border-swiggy-orange"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-black uppercase tracking-wider text-swiggy-gray">Type</Label>
                <Select
                  value={form.isFood ? "food" : "nonfood"}
                  onValueChange={(v) => setForm((p) => ({ ...p, isFood: v === "food" }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food (logo required at registration)</SelectItem>
                    <SelectItem value="nonfood">Non-Food (e.g. Grocery, Pharmacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0 pt-4">
              <Button type="button" variant="outline" className="rounded-xl font-bold h-11 px-6 border-zinc-200" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl font-black h-11 px-8 bg-swiggy-orange hover:bg-swiggy-orange/90 text-white gap-2"
              >
                {saving ? "Saving..." : (<><CheckCircle2 className="w-4 h-4" /> {editing ? "Save Changes" : "Create"}</>)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
