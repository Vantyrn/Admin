import { prisma } from "./prisma";

/**
 * Logs an administrative action or a security event.
 * @param {string} eventName - Name of the event (e.g., ADMIN_LOGIN_SUCCESS, VENDOR_APPROVED)
 * @param {object} metadata - Additional data (e.g., { vendorId: '...', reason: '...' })
 * @param {string} adminId - ID of the admin performing the action (optional for login attempts)
 */
export async function logActivity(eventName, metadata = {}, adminId = null) {
  try {
    await prisma.analyticsEventLog.create({
      data: {
        eventName,
        metadata: {
          ...metadata,
          adminId,
          timestamp: new Date().toISOString(),
          source: "ADMIN_PANEL",
        },
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // We don't throw here to avoid breaking the main flow if logging fails
  }
}

/**
 * Checks if an IP is currently rate-limited based on failed login attempts.
 * @param {string} identifier - Email or IP address to check
 * @param {number} limit - Max failures allowed
 * @param {number} windowMinutes - Time window in minutes
 */
export async function isRateLimited(identifier, limit = 5, windowMinutes = 15) {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const failCount = await prisma.analyticsEventLog.count({
      where: {
        eventName: "ADMIN_LOGIN_FAILURE",
        firedAt: { gte: windowStart },
        metadata: {
          path: ["email"],
          equals: identifier
        }
      },
    });

    return failCount >= limit;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return false; // Default to allowing if check fails
  }
}
