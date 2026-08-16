# FILUMIRE — Phase 0 Clickable Prototype

Trust and verification network demo built around persistent digital identities and verifiable claims.

## MVP flow

**Search → Match → Verify identity → Verify claims → Assess presence → Build profile → Share → Monitor**

Plus an **Admin review dashboard** for approving or rejecting verification requests.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Zustand (in-memory state + `localStorage` persistence)
- qrcode.react (QR verification)

## Setup

```bash
cd C:\Users\tabi\filumire
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo walkthrough

1. **Search** for `Jordan Ellis` or `FM-P7K2-9X4M`
2. **Match** the candidate and open identity verification
3. **Submit** identity evidence (simulated upload)
4. **Admin** → approve pending requests
5. **Claims / Presence / Profile / Share / Monitor** — follow the step nav
6. Open public profile at `/v/FM-P7K2-9X4M` or scan the QR code

Use **Reset demo** in the header to restore seed data.

## Seeded identities

| FILUMIRE ID | Type | Status |
|---|---|---|
| FM-P7K2-9X4M | Person | Verified (pending claim) |
| FM-B3N8-1Q7R | Business | Verified |
| FM-A9D4-6W2K | Person | Unverified |
| FM-C2H5-8M1P | Business | Rejected |

## Out of scope (Phase 0)

Social networking, reviews, ratings, marketplace, cryptocurrency, blockchain, complex trust scores, and real KYC integrations.
