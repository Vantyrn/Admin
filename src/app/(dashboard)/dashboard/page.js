"use client";

import { 
  Users, 
  ShoppingBag, 
  Bike, 
  TrendingUp,
  Receipt,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealtime } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, loading } = useRealtime("/api/dashboard/stats", {
    interval: 1000,
    toastConfig: {
      new: (order) => `New Order Received!`,
      description: (order) => `Order #${order.id} for ₹${order.amount}`
    }
  });


  const { stats = [], recentOrders = [] } = data || {};

  const getIcon = (iconName) => {
    switch (iconName) {
      case "TrendingUp": return TrendingUp;
      case "ShoppingBag": return ShoppingBag;
      case "Receipt": return Receipt;
      case "Bike": return Bike;
      case "Users": return Users;
      default: return TrendingUp;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          stats.map((stat) => {
            const Icon = getIcon(stat.icon);
            return (
              <div key={stat.label} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group cursor-default">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-xl transition-transform group-hover:scale-110 duration-200`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className={`${stat.color} border-current/20 font-semibold bg-transparent`}>
                    {stat.change}
                  </Badge>
                </div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">{stat.label}</h3>
                <p className="text-3xl font-bold text-swiggy-navy dark:text-white">{stat.value}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Hero Banner / Call to Action Section */}
      <div className="relative min-h-[16rem] sm:h-64 rounded-2xl sm:rounded-3xl overflow-hidden bg-swiggy-navy flex items-center px-6 sm:px-12 group">
        <div className="z-10 relative space-y-3 sm:space-y-4 max-w-xl py-8">
          <Badge className="bg-swiggy-orange text-white hover:bg-swiggy-orange/90 border-none px-3">Live Status</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
            Managing <span className="text-swiggy-orange italic">Vantyrn</span> operations in real-time.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base font-medium">
            Track orders, manage vendors, and oversee delivery logistics from your premium dashboard.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-swiggy-orange/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-swiggy-orange rounded-full blur-[100px] opacity-20 animate-pulse" />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-swiggy-navy dark:text-white">Recent Orders</h3>
            <p className="text-xs sm:text-sm text-swiggy-gray font-medium">Keep track of the latest food deliveries</p>
          </div>
          <button className="text-swiggy-orange font-semibold text-sm hover:underline text-left">View All Orders</button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md group gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center font-black text-[10px] text-swiggy-navy dark:text-white px-2 border border-zinc-200 dark:border-zinc-700">
                    <span className="truncate">#{order.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm sm:text-base text-swiggy-navy dark:text-white truncate uppercase tracking-tight">{order.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-swiggy-gray font-bold uppercase tracking-wider mt-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        {new Date(order.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span className="hidden xs:inline w-1 h-1 rounded-full bg-zinc-300" />
                      <Badge variant="secondary" className="text-[9px] py-0 px-2 font-black border-none bg-zinc-100 text-zinc-500">
                        {order.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-50 mt-1 sm:mt-0">
                  <p className="font-black text-base sm:text-lg text-swiggy-navy dark:text-white">{order.amount}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
                    {order.status.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500 font-medium italic">
              No recent orders found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
