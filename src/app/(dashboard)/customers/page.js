"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  User, 
  Mail,
  Phone,
  Eye,
  Calendar,
  ShoppingBag,
  UserCheck,
  UserMinus,
  ShieldAlert,
  Ban,
  Flag,
  MoreVertical,
  AlertCircle
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

// Mock Data removed

export default function CustomersPage() {
  const { data: customers, loading } = useRealtime("/api/customers", {
    toastConfig: {
      new: (c) => `New Customer Signup!`,
      description: (c) => `${c.name} just joined.`
    }
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!selectedCustomer || !newStatus) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/customers/${selectedCustomer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: statusReason })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Customer status updated to ${newStatus}`);
      setIsStatusModalOpen(false);
      setSelectedCustomer(null);
      setStatusReason("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!customers) return [];
    return customers.filter(item => {
      if (typeFilter === "GUEST") return item.isGuest;
      if (typeFilter === "REGISTERED") return !item.isGuest;
      return true;
    });
  }, [customers, typeFilter]);

  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: "Customer ID",
      cell: ({ row }) => (
        <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">{row.original.id}</span>
      )
    },
    {
      accessorKey: "name",
      header: "Full Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-500 font-bold uppercase text-xs shadow-sm">
            {row.original.isGuest ? <UserMinus className="w-4 h-4 text-zinc-400" /> : row.original.name.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-zinc-900 dark:text-white capitalize leading-none">{row.original.name}</span>
            {row.original.isGuest && <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Guest Account</p>}
          </div>
        </div>
      )
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-swiggy-navy">{row.original.phone}</span>
      )
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-swiggy-navy lowercase">{row.original.email}</span>
      )
    },
    {
      accessorKey: "registeredAt",
      header: "Registered At",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-swiggy-gray" />
          <span className="text-xs font-bold text-swiggy-gray uppercase">{new Date(row.original.registeredAt).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      accessorKey: "totalOrders",
      header: "Total Orders",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-black border-zinc-200 text-swiggy-navy bg-zinc-50 rounded-lg px-3">
          {row.original.orders}
        </Badge>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || "ACTIVE";
        const colorMap = {
          ACTIVE: "bg-green-50 text-green-600 border-green-100",
          SUSPENDED: "bg-red-50 text-red-600 border-red-100",
          DISABLED: "bg-zinc-50 text-zinc-600 border-zinc-100",
          PENDING: "bg-amber-50 text-amber-600 border-amber-100"
        };
        return (
          <Badge className={`${colorMap[status] || colorMap.ACTIVE} font-black text-[9px] uppercase tracking-widest border`}>
            {status}
          </Badge>
        );
      }
    },
    {
      accessorKey: "spent",
      header: "Total Spent",
      cell: ({ row }) => (
        <span className="font-black text-swiggy-navy">{row.original.spent}</span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/customers/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 rounded-lg">
              <Eye className="h-4 w-4 text-zinc-500" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 rounded-lg">
                <MoreVertical className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
              <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-400 px-2 py-1.5">Administrative</DropdownMenuLabel>
              {row.original.status === "SUSPENDED" || row.original.status === "DISABLED" ? (
                <DropdownMenuItem 
                  className="rounded-lg gap-2 cursor-pointer font-bold text-green-600 focus:bg-green-50 focus:text-green-700"
                  onClick={() => {
                    setSelectedCustomer(row.original);
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
                      setSelectedCustomer(row.original);
                      setNewStatus("PENDING"); // Flagging as pending for review
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <Flag className="w-4 h-4" /> Flag for Review
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="rounded-lg gap-2 cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
                    onClick={() => {
                      setSelectedCustomer(row.original);
                      setNewStatus("SUSPENDED");
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <Ban className="w-4 h-4" /> Suspend Account
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="rounded-lg gap-2 cursor-pointer font-bold text-zinc-600 focus:bg-zinc-50 focus:text-zinc-700"
                    onClick={() => {
                      setSelectedCustomer(row.original);
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


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">Customer Directory</h1>
          <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1">Manage foodies, guest users, and loyalty data</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="p-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl sm:rounded-2xl flex gap-1 shadow-sm overflow-x-auto scrollbar-hide">
              <Button 
                variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={`rounded-lg sm:rounded-xl px-4 font-bold text-xs sm:text-sm ${typeFilter === 'ALL' ? 'bg-swiggy-orange text-white hover:bg-swiggy-orange/90' : ''}`}
                onClick={() => setTypeFilter('ALL')}
              >
                All
              </Button>
              <Button 
                variant={typeFilter === 'REGISTERED' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={`rounded-lg sm:rounded-xl px-4 font-bold text-xs sm:text-sm ${typeFilter === 'REGISTERED' ? 'bg-swiggy-orange text-white hover:bg-swiggy-orange/90' : ''}`}
                onClick={() => setTypeFilter('REGISTERED')}
              >
                Registered
              </Button>
              <Button 
                variant={typeFilter === 'GUEST' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={`rounded-lg sm:rounded-xl px-4 font-bold text-xs sm:text-sm ${typeFilter === 'GUEST' ? 'bg-swiggy-orange text-white hover:bg-swiggy-orange/90' : ''}`}
                onClick={() => setTypeFilter('GUEST')}
              >
                Guest
              </Button>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiggy-gray" />
            <Input 
              placeholder="Search customers..." 
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 h-10 sm:h-12 border-zinc-200 rounded-lg sm:rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
          <div className="responsive-table-container">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-zinc-500 font-black uppercase text-[10px] tracking-widest py-4 sm:py-5">
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
                          <TableCell key={j} className="py-4 border-b border-zinc-50">
                            <Skeleton className="h-6 w-full rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-4 border-b border-zinc-50 last:border-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-500 font-medium italic">
                        <div className="flex flex-col items-center gap-2">
                           <UserMinus className="w-8 h-8 opacity-20" />
                           No customers found matching your criteria.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs sm:text-sm font-bold text-swiggy-gray">
            Showing <span className="text-swiggy-navy">{table.getState().pagination.pageIndex + 1}</span> of <span className="text-swiggy-navy">{table.getPageCount()}</span> pages
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.previousPage()} 
              disabled={!table.getCanPreviousPage()}
              className="font-bold h-10 sm:h-11 px-4 sm:px-6 rounded-lg sm:rounded-xl border-zinc-200 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
              className="font-bold h-10 sm:h-11 px-4 sm:px-6 rounded-lg sm:rounded-xl border-zinc-200 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-8 border-b border-zinc-50">
            <DialogTitle className="text-xl font-black text-swiggy-navy uppercase flex items-center gap-3">
               <AlertCircle className={`w-6 h-6 ${newStatus === 'SUSPENDED' ? 'text-red-500' : 'text-amber-500'}`} />
               {newStatus === 'ACTIVE' ? 'Reactivate Customer' : newStatus === 'SUSPENDED' ? 'Suspend Customer' : 'Flag Customer'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-swiggy-gray mt-1">
              Confirm administrative action for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Reason for this action</Label>
              <Input 
                placeholder="e.g. Repeated cancellation, Fraudulent activity..." 
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <p className="text-[11px] font-bold text-zinc-500 leading-relaxed italic">
              * This action will be logged in the system audit and may restrict the customer's ability to place orders.
            </p>
          </div>
          <DialogFooter className="p-8 bg-zinc-50 border-t border-zinc-100 flex gap-2">
            <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)} className="flex-1 font-bold">Cancel</Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={updating}
              className={`flex-1 font-black uppercase tracking-widest text-white shadow-lg ${
                newStatus === 'SUSPENDED' ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 
                newStatus === 'ACTIVE' ? 'bg-green-500 hover:bg-green-600 shadow-green-100' :
                'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
              }`}
            >
              {updating ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
