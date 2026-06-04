"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  Filter, 
  ShoppingBag, 
  User, 
  Store, 
  Bike, 
  AlertTriangle,
  Calendar,
  Eye,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock Data removed

const STATUS_CONFIG = {
  PENDING_VENDOR: { label: "Pending Vendor", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Accepted", color: "bg-sky-100 text-sky-700 border-sky-200" },
  PREPARING: { label: "Preparing", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  READY: { label: "Ready for Pickup", color: "bg-purple-100 text-purple-700 border-purple-200" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700 border-orange-200" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  REFUNDED: { label: "Refunded", color: "bg-gray-100 text-gray-700 border-gray-200" },
  FLAGGED: { label: "Flagged", color: "bg-red-50 text-red-600 border-red-200" },
};

const SlaTimer = ({ createdAt, status }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, 300 - elapsed);
  });

  const isPendingVendor = status === 'PAYMENT_SUCCESSFUL' || status === 'PLACED' || status === 'PENDING' || status === 'PENDING_VENDOR';

  useEffect(() => {
    if (!isPendingVendor && status !== 'FLAGGED') return;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      return Math.max(0, 300 - elapsed);
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, status]);

  if (!isPendingVendor && status !== 'FLAGGED') return <span className="text-zinc-300 font-medium text-xs">-</span>;

  if (timeLeft === 0 || status === 'FLAGGED') {
    return (
      <div className="flex items-center gap-1.5 text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg w-fit border border-red-100">
        <AlertTriangle className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-widest">Flagged</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg w-fit border border-amber-100">
      <Clock className="w-3 h-3 animate-pulse" />
      <span className="text-[11px] font-mono tracking-widest">{timeLeft}s</span>
    </div>
  );
};

export default function OrdersPage() {
  const { data: orders, loading } = useRealtime("/api/orders", {
    interval: 1000,
    toastConfig: {
      new: (o) => `New Order #${o.shortId} Received!`,
      description: (o) => `Amount: ${o.amount}`
    }
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const filteredData = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      // Quick Filter Tabs
      if (quickFilter === "ACTIVE" && !["PAYMENT_SUCCESSFUL", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(order.status)) return false;
      if (quickFilter === "FLAGGED" && !order.isFlagged) return false;
      if (quickFilter === "COMPLETED" && order.status !== "DELIVERED") return false;
      if (quickFilter === "CANCELLED" && order.status !== "CANCELLED") return false;

      // Status Filter Dropdown
      if (statusFilter !== "ALL") {
        if (statusFilter === "FLAGGED") {
          if (!order.isFlagged) return false;
        } else if (statusFilter === "PENDING_VENDOR") {
          return order.status === "PENDING_VENDOR" || order.status === "PAYMENT_SUCCESSFUL";
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [orders, quickFilter, statusFilter]);

  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isFlagged && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          <span className="font-bold text-swiggy-navy uppercase tracking-tight">{row.original.shortId}</span>
        </div>
      )
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-swiggy-navy leading-none">{row.original.customerName}</p>
          <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-widest">{row.original.shortId}</p>
        </div>
      )
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-swiggy-navy">{row.original.vendorName}</span>
      )
    },

    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusKey = row.original.status === "PAYMENT_SUCCESSFUL" ? "PENDING_VENDOR" : row.original.status;
        const config = STATUS_CONFIG[statusKey] || { label: row.original.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
        return (
          <Badge className={`${config.color} border font-black text-[9px] uppercase tracking-widest px-2 py-0.5`}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-black text-swiggy-navy">{row.original.amount}</span>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase">{new Date(row.original.time).toLocaleString()}</span>
        </div>
      )
    },
    {
      id: "timer",
      header: "SLA Timer",
      cell: ({ row }) => <SlaTimer createdAt={row.original.time} status={row.original.status} />
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-swiggy-orange hover:text-white rounded-lg">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
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
    getSortedRowModel: getSortedRowModel(),
  });


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">Orders Lifecycle</h1>
          <p className="text-xs sm:text-sm text-swiggy-gray font-medium mt-1">Real-time order tracking and exception management</p>
        </div>
        <Tabs defaultValue="ALL" className="w-full lg:w-fit" onValueChange={setQuickFilter}>
          <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-100 p-1 rounded-xl sm:rounded-2xl h-12 sm:h-14 shadow-sm w-full lg:w-fit flex overflow-x-auto overflow-y-hidden justify-start lg:justify-center scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {["ALL", "ACTIVE", "FLAGGED", "COMPLETED", "CANCELLED"].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className="rounded-lg sm:rounded-xl px-4 sm:px-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest h-full data-[state=active]:bg-swiggy-orange data-[state=active]:text-white transition-all shrink-0"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiggy-gray" />
              <Input 
                placeholder="Search by Order ID or Customer Phone..." 
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 h-11 border-zinc-200 rounded-xl"
              />
           </div>
           
           <div className="flex gap-2">
              <Input 
                type="date" 
                placeholder="Start" 
                className="h-11 border-zinc-200 rounded-xl text-[10px] font-bold uppercase"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
              <Input 
                type="date" 
                placeholder="End" 
                className="h-11 border-zinc-200 rounded-xl text-[10px] font-bold uppercase"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
           </div>

           <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-xl font-bold text-sm">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="FLAGGED" className="text-amber-600 font-black">Flagged Only</SelectItem>
                {Object.entries(STATUS_CONFIG).filter(([key]) => key !== "FLAGGED").map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
           </Select>
        </div>

        <div className="responsive-table-container">
          <div className="rounded-xl border border-zinc-100 overflow-hidden min-w-[1000px]">
            <Table>
            <TableHeader className="bg-zinc-50 border-b border-zinc-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-zinc-500 font-black uppercase text-[10px] tracking-widest py-4">
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
                  <TableRow 
                    key={row.id} 
                    className={cn(
                      "hover:bg-zinc-50/50 transition-colors",
                      row.original.isFlagged && "bg-amber-50/30 hover:bg-amber-50/50"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4 border-b border-zinc-50 last:border-0 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-500 font-medium italic">
                    <div className="flex flex-col items-center gap-2">
                       <ShoppingBag className="w-8 h-8 opacity-20" />
                       No orders found matching your criteria.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm font-bold text-swiggy-gray">
            Showing <span className="text-swiggy-navy">{table.getState().pagination.pageIndex + 1}</span> of <span className="text-swiggy-navy">{table.getPageCount()}</span> pages
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.previousPage()} 
              disabled={!table.getCanPreviousPage()}
              className="font-bold h-10 px-6 rounded-xl border-zinc-200"
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
              className="font-bold h-10 px-6 rounded-xl border-zinc-200"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
