# Vantryn Admin Web Dashboard

This repository contains the Next.js control center for the **Vantryn Quick Commerce** platform. It provides administrative oversight, merchant KYC verifications, driver tracking, live order SLA override operations, and push notification controls.

---

## 1. Project Stack & Architecture

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Vanilla CSS variables
- **Database Client:** Prisma ORM connected to serverless PostgreSQL (Neon)
- **Authentication:** Token-based secure operator logins backed by shared secrets (`ADMIN_SECRET`) and rate-limiting metrics.
- **APIs & Proxies:** Secure API proxy endpoints under `/api/notifications` that route mass push notification broadcasts to the central Express server.

---

## 2. Onboarding & Local Development Setup

To run the Admin Dashboard locally:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a local `.env` file or define variables in your hosting environment.
> [!IMPORTANT]
> Do NOT push secret values to version control. Refer to the [Master README Configuration Guide](../README.md#3-global-environment-configuration) for the exact list of variables required (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `ADMIN_SEED_PASSWORD`, `NEXT_PUBLIC_BACKEND_URL`).

### Step 3: Run Database Seeding
Ensure you seed the database to create required product categories and upsert the super admin credentials (`abid@gmail.com` with the password configured in `ADMIN_SEED_PASSWORD`).
```bash
npm run seed
```
*(Or manually run: `node prisma/seed.mjs`)*

### Step 4: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Build for Production
```bash
npm run build
npm start
```

---

## 3. PRD Requirement Audit Compliance

| Requirement ID | Module Name | Compliance | Implementation Details & File Reference |
| :--- | :--- | :--- | :--- |
| **A1.1** | Merchant/Rider Onboarding KYC | **100% Met** | Documents are reviewed at `src/app/(dashboard)/vendors/[id]/page.js`. Status toggled via PUT requests. |
| **A1.2** | Shadowfax Store Linkage | **100% Met** | The Link Shadowfax Modal is enforced before approval at `src/app/(dashboard)/vendors/[id]/page.js`. |
| **A1.3** | Account Controls (Suspend/Disable) | **100% Met** | Supports duration-based temporary disablement using ISO-8601 formatting (`DISABLED:2026-06-06T...`) at `src/app/api/admin/vendors/route.js`. |
| **A2.1** | Global Live Order Board | **100% Met** | Order table at `src/app/(dashboard)/orders/page.js` lists all active orders in real-time. |
| **A2.2** | SLA Breach Warnings | **100% Met** | Visually flags orders exceeding the 5-minute threshold at `src/app/(dashboard)/orders/page.js`. |
| **A2.3** | Operational Overrides & Logging | **100% Met** | Admin overrides (cancellations/refunds) require audit notes logged in `prisma.orderAuditLog` table. |
| **A3.1** | Dashboard Statistics | **100% Met** | Operational stats board displaying online merchants, sales totals, commissions, and SLA breaches on the main landing dashboard. |
| **A4.1** | Global Configuration Store | **100% Met** | Manage key-value configurations (e.g. delivery fee, radius) under the Admin settings panel. |
| **A4.2** | Broadcast Notification Console | **100% Met** | Send targeted pushes. Features a secure API Proxy at `/api/notifications` preventing API key leakage. |
| **A5.1** | Audit Log Viewer | **100% Met** | Administrative action tracking table to monitor operator overrides and config modifications. |

---

## 4. Troubleshooting & Operational Notes

- **Admin Seeding Issues:** If you encounter unique constraint errors on database seeding, verify that the database table schema is synchronized. The seed script uses an `upsert` pattern to dynamically update admin credentials without duplications.
- **Mass Push Failures:** Mass push notifications are securely brokered through a proxy at `src/app/api/notifications/route.js` to shield the `ADMIN_SECRET` from customer/vendor client exposure. Ensure that `ADMIN_SECRET` matches on both the Admin app and the `Vendor-2026` backend.
