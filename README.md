# Clean Car Wash - Same-Day Booking Platform (Production MVP)

A production-quality MVP for a Car Wash Booking Platform that reduces waiting time at car washes by converting the physical queue into same-day appointments using unique branch QR codes.

---

## 🌟 Key Product Architecture & Business Rules

1. **No Customer Accounts**: Customers never create passwords, usernames, or accounts. They only enter their Name and Phone number.
2. **Same-Day Only**: Bookings cannot be made for future dates or past times.
3. **Customer Bay Privacy**: The customer **NEVER sees or selects the wash bay**. The system automatically assigns an available bay internally.
4. **Unique Branch QR Codes**: Each physical branch has ONE unique QR code identifier (e.g. `/book/clean-car-maadi`). The same QR works at home or on-site.
5. **Slot Selection**: Customers can select **"Nearest Available"** or choose any other available time today.
6. **Capacity & Concurrency Engine**: Built-in atomic transaction prevents double booking of the last available bay.
7. **OTP Verification**: OTP is generated and sent **after** clicking "Confirm Booking", holding a temporary 5-minute reservation before transitioning to `CONFIRMED`.
8. **My Booking Flow**: Customers can look up and cancel their active same-day booking using Phone Number + OTP. Cancellation immediately releases capacity back to the branch.
9. **Branch Staff Dashboard**: Isolated to their assigned branch. Displays today's schedule organized by Time and Bay, with status transitions (`CONFIRMED` → `WASHING` → `COMPLETED`, `CANCELLED`, `NO_SHOW`).
10. **Admin Dashboard**: Super admin controls brands, branches, bay capacity, operating hours, and live QR code generation/printing.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Database**: SQLite (via Prisma ORM, zero-dependency out-of-the-box local execution, easily switchable to PostgreSQL via `DATABASE_URL`)
- **Validation**: Zod
- **Authentication**: JWT with secure HTTP-only cookies + bcryptjs
- **QR Engine**: `qrcode` (data URL generation & printable views)
- **Testing**: Vitest (Unit, Integration & Concurrency tests)

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database & Seed
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Seed branches, bays, users, and sample bookings
npm run db:seed
```

### 3. Run Automated Test Suite
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Seed Credentials & Demo Links

### Customer Booking (Simulated QR Scans):
- **Maadi Branch**: [http://localhost:3000/book/clean-car-maadi](http://localhost:3000/book/clean-car-maadi) (3 Bays, 09:00 - 22:00)
- **Nasr City Branch**: [http://localhost:3000/book/clean-car-nasr-city](http://localhost:3000/book/clean-car-nasr-city) (2 Bays, 10:00 - 23:00)
- **My Booking (Customer Lookup)**: [http://localhost:3000/my-booking](http://localhost:3000/my-booking)

### Branch Staff Dashboard:
- **Login URL**: [http://localhost:3000/staff/login](http://localhost:3000/staff/login)
- **Maadi Staff**: `staff.maadi@cleancar.com` / `staff123456`
- **Nasr City Staff**: `staff.nasr@cleancar.com` / `staff123456`

### Admin Dashboard:
- **Login URL**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Admin**: `admin@cleancar.com` / `admin123456`

### Development Mock OTP:
- In development (`ENABLE_MOCK_OTP="true"`), the generated 6-digit OTP code is logged directly to the server terminal console and displayed with an "Auto-Fill" button on screen for immediate testing!

---

## 🧪 Test Coverage Summary
- `tests/availability.test.ts`: Operating hours, closing boundary, past time exclusion, bay capacity threshold, same-day restriction, nearest available slot, bay privacy sanitization.
- `tests/booking-engine.test.ts`: Automatic bay allocation, customer data sanitization (NO bay in summary), race condition prevention (`SLOT_FULLY_BOOKED`), cancellation capacity release.
- `tests/otp.test.ts`: Verification, attempt limits exhaustion, resend cooldown, expiration.
- `tests/auth-and-status.test.ts`: Password hashing, JWT sessions, role checks, branch isolation, and status state machine transitions.
