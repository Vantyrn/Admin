/**
 * Utility to send mass notifications via the backend API.
 */
export async function sendMassNotification(audience, title, message) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://vendor-backend-production-c171.up.railway.app"; 

    const response = await fetch(`${BACKEND_URL}/api/admin/broadcast-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // If you have admin authentication tokens, add them here
        // 'Authorization': `Bearer ${adminToken}` 
      },
      body: JSON.stringify({
        audience: audience, // "VENDORS", "CUSTOMERS", or "ALL"
        title: title,       // e.g., "Flash Sale!"
        message: message    // e.g., "Get 50% off today only!"
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return { 
        success: true, 
        message: `Successfully sent to ${data.result?.success || 'all'} users!`,
        result: data.result 
      };
    } else {
      return { 
        success: false, 
        error: data.error || data.message || "Failed to send notification" 
      };
    }
    
  } catch (error) {
    console.error("Error connecting to backend:", error);
    return { 
      success: false, 
      error: "Could not connect to the backend server." 
    };
  }
}
