"use client";

import React, { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Search,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";

// Mock Data removed

export default function KYCQueuePage() {
  const { data: queue, loading } = useRealtime("/api/vendors/kyc");

  if (loading || !queue) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-swiggy-navy dark:text-white tracking-tight">KYC Review Queue</h1>
          <p className="text-sm text-swiggy-gray font-medium mt-1">Review and approve vendor documentation (FIFO Basis)</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-swiggy-orange/10 text-swiggy-orange border-swiggy-orange/20 px-4 py-2 font-black rounded-full text-xs">
            {queue.length} Pending Reviews
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-zinc-100 shadow-sm bg-swiggy-orange/5">
          <CardHeader className="p-6">
            <CardTitle className="text-sm font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-swiggy-orange" /> Oldest Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
             <p className="text-2xl font-black text-swiggy-navy">{queue[0]?.timeWaiting || 'N/A'}</p>
             <p className="text-xs font-bold text-swiggy-gray mt-1">Time spent waiting for review</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-zinc-100 shadow-sm">
          <CardHeader className="p-6">
            <CardTitle className="text-sm font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-swiggy-orange" /> Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
             <p className="text-2xl font-black text-swiggy-navy">94.2%</p>
             <p className="text-xs font-bold text-swiggy-gray mt-1">Vendors approved this month</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-100 shadow-sm">
          <CardHeader className="p-6">
            <CardTitle className="text-sm font-black text-swiggy-navy uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-swiggy-orange" /> Avg. Review Time
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
             <p className="text-2xl font-black text-swiggy-navy">4.5 Hrs</p>
             <p className="text-xs font-bold text-swiggy-gray mt-1">Target is under 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8 shadow-sm">
        <div className="rounded-2xl border border-zinc-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">Vendor Name</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">Submission Date</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">Waiting Time</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                <TableHead className="text-right text-zinc-500 font-bold uppercase text-[10px] tracking-widest py-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <TableCell className="py-5">
                    <div className="font-black text-swiggy-navy dark:text-white uppercase tracking-tight">{vendor.businessName}</div>
                    <div className="text-xs font-medium text-swiggy-gray mt-0.5">{vendor.ownerName}</div>
                  </TableCell>
                  <TableCell className="py-5 text-sm font-bold text-swiggy-gray">{vendor.submissionDate}</TableCell>
                  <TableCell className="py-5">
                    <Badge variant="outline" className="font-bold border-zinc-200 text-swiggy-navy bg-zinc-50">
                      {vendor.timeWaiting}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <Badge className={`${vendor.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-blue-100 text-blue-700 border-blue-200'} border font-bold text-[10px] uppercase`}>
                      {vendor.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5 text-right">
                    <Link href={`/vendors/${vendor.id}?tab=kyc`}>
                      <Button className="bg-swiggy-orange hover:bg-swiggy-orange/90 text-white font-black px-6 rounded-xl h-10 gap-2">
                        Review Documents
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
