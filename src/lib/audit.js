import { prisma } from "./prisma";
import logger from "./logger";

// Infers the entity a log line is about from its metadata, so the
// admin_activity_logs table gets a clean (entity_type, entity_id) pair
// without every call site having to spell it out.
function inferEntity(metadata = {}) {
  if (metadata.vendorId) return { type: "VENDOR", id: metadata.vendorId };
  if (metadata.customerId) return { type: "CUSTOMER", id: metadata.customerId };
  if (metadata.orderId) return { type: "ORDER", id: metadata.orderId };
  if (metadata.riderId) return { type: "RIDER", id: metadata.riderId };
  if (metadata.productId) return { type: "PRODUCT", id: metadata.productId };
  return { type: null, id: null };
}

// Only persist values that look like UUIDs into admin_activity_logs.entity_id
// (the column is typed @db.Uuid — a non-uuid would throw).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Logs an administrative action or a security event.
 *
 * Writes to THREE sinks (each independent — a failure in one never blocks the
 * others, and logging never throws into the request flow):
 *   1. analyticsEventLog  — durable event row; also powers login rate-limiting.
 *   2. admin_activity_logs — the human-readable admin audit trail (who did what,
 *      to which entity, when) shown on entity pages. Only written when we know
 *      which admin acted (adminId present).
 *   3. logger (Loki)      — central structured logging (workflow §4.5).
 *
 * @param {string} eventName - Name of the event (e.g., ADMIN_LOGIN_SUCCESS, VENDOR_APPROVE_VENDOR)
 * @param {object} metadata - Additional data (e.g., { vendorId: '...', reason: '...' })
 * @param {string} adminId - ID of the admin performing the action (optional for login attempts)
 */
export async function logActivity(eventName, metadata = {}, adminId = null) {
  const { type: entityType, id: entityId } = inferEntity(metadata);

  // 1. Analytics event row (unchanged — rate-limiting reads this table).
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
    logger.error("audit: failed to write analyticsEventLog", error, {
      component: "lib/audit",
      operation: "logActivity.analyticsEventLog",
      event: eventName,
      adminId: adminId || undefined,
    });
  }

  // 2. Admin audit trail — only when we know who acted.
  if (adminId) {
    try {
      await prisma.admin_activity_logs.create({
        data: {
          admin_id: adminId,
          action: eventName,
          entity_type: entityType,
          entity_id: entityId && UUID_RE.test(String(entityId)) ? entityId : null,
          metadata,
        },
      });
    } catch (error) {
      logger.error("audit: failed to write admin_activity_logs", error, {
        component: "lib/audit",
        operation: "logActivity.adminActivityLogs",
        event: eventName,
        adminId,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
      });
    }
  }

  // 3. Central structured logging (console + Loki). Never throws.
  logger.info(`admin.event ${eventName}`, {
    event: eventName,
    adminId: adminId || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    ...metadata,
  });
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
    logger.error("audit: rate-limit check failed", error, {
      component: "lib/audit",
      operation: "isRateLimited",
      identifier,
    });
    return false; // Default to allowing if check fails
  }
}
