
# Property Hunter App — Execution Playbook (Netlify + Airtable + Firecrawl)

Owner: Adrian Lo  
Goal: Rapid MVP for tracking Singapore condo listings and contacting agents quickly via WhatsApp.

Primary UX requirement:
- Contact Hub page showing all agent contacts on one screen
- Quick actions: WhatsApp, Call, Copy Number

Deployment target:
- Netlify

Execution agent:
- Codex Desktop

---

# Architecture

Mobile UI (generated from Stitch screens)
        ↓
Netlify frontend app
        ↓
Netlify Functions (API layer)
        ↓
Firecrawl (scrape listing data)
        ↓
Airtable (temporary database)

---

# Phase 1 — Repo Initialization

Create repository:

property-hunter-app

Structure:

property-hunter-app
├── app
│   ├── pages
│   │   ├── dashboard
│   │   ├── listings
│   │   ├── property
│   │   ├── contacts
│   │   └── shortlist
│   ├── components
│   ├── hooks
│   └── styles
│
├── netlify
│   └── functions
│       ├── importListing.ts
│       └── getListings.ts
│
├── lib
│   ├── airtable.ts
│   ├── firecrawl.ts
│   └── normalizer.ts
│
├── types
│   └── models.ts
│
├── public
├── package.json
└── netlify.toml

Framework recommendation: Next.js

---

# Phase 2 — Environment Variables

Create `.env.local`

AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
FIRECRAWL_API_KEY=

Set the same variables in Netlify dashboard.

---

# Phase 3 — Airtable Schema

Create Airtable base: PropertyHunter

## Listings Table

Fields:

listing_id
project_name
address
district
price
size_sqft
psf
bedrooms
bathrooms
tenure
top_year
mrt_station
mrt_walk_mins
ips_drive_mins
source_url
source_site
agent_name
agent_phone
status
notes

Status values:

new
shortlisted
viewing_booked
viewed
negotiating
dropped

## Agents Table

agent_id
agent_name
phone
agency
notes
contacted

Formula field:

whatsapp_link

"https://wa.me/" & SUBSTITUTE({phone},"+","")

---

# Phase 4 — Type Models

File: types/models.ts

Example:

export interface Listing {
  id: string
  projectName: string
  address: string
  district: string
  price: number
  sizeSqft: number
  psf: number
  bedrooms: number
  agentName: string
  agentPhone: string
  sourceUrl: string
  status: string
}

---

# Phase 5 — Firecrawl Integration

File: lib/firecrawl.ts

Purpose:

scrape listing page  
extract fields  
return structured JSON

Fields to extract:

price
size
bedrooms
address
project
agent
phone

---

# Phase 6 — Normalizer

File: lib/normalizer.ts

Purpose:

Convert Firecrawl output → Airtable format

Tasks:

normalize price  
normalize sqft  
normalize phone number  
clean agent name  
map district

Phone normalization format:

+65XXXXXXXX

---

# Phase 7 — Airtable Client

File: lib/airtable.ts

Functions:

createListing()
getListings()
createAgentIfMissing()

---

# Phase 8 — Import Endpoint

Netlify Function:

netlify/functions/importListing.ts

Flow:

POST /api/import-listing

1 receive URL  
2 call Firecrawl  
3 normalize fields  
4 upsert Airtable listing  
5 upsert agent  
6 return listing JSON

Example request:

POST /api/import-listing
{
  "url": "https://property-site-listing"
}

---

# Phase 9 — Contact Hub

Route: /contacts

Purpose:

Single page showing all agents

Layout:

Agent name  
Phone  
Listings represented  

Actions:

WhatsApp  
Call  
Copy

WhatsApp link format:

https://wa.me/{phone}

Example:

Agent: John Tan  
Phone: +6591234567  

[WhatsApp] [Call] [Copy]

---

# Phase 10 — Listings Page

Route: /listings

Columns:

Project  
Price  
Size  
PSF  
Bedrooms  
District  
Agent  
Status

Row actions:

View  
WhatsApp  
Call

---

# Phase 11 — Property Detail

Route: /property/[id]

Sections:

Property details  
Pricing  
Transport  
Agent contact card  
Notes

Agent card:

Name  
Phone  

[WhatsApp]  
[Call]  
[Copy]

---

# Phase 12 — Dashboard

Route: /dashboard

Widgets:

total properties  
shortlisted  
viewed  
average psf

Charts:

price vs size  
score ranking  
district distribution

---

# Phase 13 — Deployment

Netlify config: netlify.toml

Example:

[build]
command = "npm run build"
publish = ".next"

[functions]
directory = "netlify/functions"

---

# Phase 14 — End-to-End Test

paste property URL  
↓  
Firecrawl scrape  
↓  
listing added to Airtable  
↓  
listing appears in app  
↓  
agent appears in Contact Hub  
↓  
WhatsApp opens correctly

---

# Phase 15 — Optional Enhancements

property scoring  
URA transformation signals  
PSF comparisons  
listing deduplication  
auto MRT distance calculation

---

# MVP Definition

MVP complete when:

import listing works  
listings table loads  
contact hub works  
whatsapp links open correctly

---

# Codex Execution Mode

Execute phases sequentially.  
Commit after each phase.  
Pause for review after Phase 5.
