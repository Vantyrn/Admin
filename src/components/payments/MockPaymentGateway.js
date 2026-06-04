"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MockPaymentGateway({ amount, orderId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);

  const simulatePayment = async (status) => {
    setLoading(true);
    try {
      // Simulate API call to capture mock payment
      const res = await fetch("/api/payments/mock/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment simulation failed");
      }

      if (status === "success") {
        toast.success("Payment successful (Mock)");
        if (onSuccess) onSuccess(data);
      } else {
        toast.error("Payment failed (Mock)");
        if (onCancel) onCancel(data);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-xl font-semibold text-blue-600">Mock Payment Gateway</CardTitle>
        <CardDescription>
          Simulate a payment transaction for Order: <span className="font-mono text-xs">{orderId || "N/A"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          ₹{amount || "0.00"}
        </div>
        <p className="text-sm text-gray-500">Total Amount Payable</p>
      </CardContent>
      <CardFooter className="flex gap-4 w-full">
        <Button 
          variant="outline" 
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => simulatePayment("failed")}
          disabled={loading}
        >
          Decline
        </Button>
        <Button 
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => simulatePayment("success")}
          disabled={loading}
        >
          {loading ? "Processing..." : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  );
}
