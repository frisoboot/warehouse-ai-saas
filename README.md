# EcoGiving Warehouse Management System

A full-stack warehouse management system built for EcoGiving, a sustainable corporate gifts company. Built with Next.js 14, Supabase, and shadcn/ui.

## Features

- **Dashboard** - Overview of inventory stats, recent movements, and quick actions
- **Products Management** - Full CRUD for products with sustainability attributes
- **Inbound Receiving** - Receive stock with barcode scanning support
- **Outbound Picking** - Pick and ship stock with availability checking
- **Inventory Overview** - Real-time stock levels with filters and CSV export
- **Assembly Management** - Bill of materials and assembly order tracking
- **Locations Management** - Structured warehouse location system
- **Movement History** - Complete audit trail with filters and export
- **PWA Support** - Works offline on tablets and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Validation**: Zod
- **Barcode Scanning**: html5-qrcode
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone and Install

```bash
git clone <repo-url>
cd warehouse-ai-saas
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:
   - Copy the contents of `supabase/migrations/00001_initial_schema.sql`
   - Paste and run in the SQL Editor
3. This creates all tables, indexes, RLS policies, and seed data

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase dashboard under **Settings > API**.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `products` | Product catalog with sustainability attributes |
| `locations` | Warehouse locations (warehouse/zone/aisle/shelf/bin) |
| `inventory` | Current stock levels per product per location |
| `movements` | Audit trail of all stock movements |
| `assemblies` | Bill of materials (components for packages) |
| `assembly_orders` | Assembly work orders |

### Key Relationships

- **Inventory** links products to locations with quantities
- **Movements** track all changes (inbound, outbound, transfer, adjustment, assembly)
- **Assemblies** define which components make up a finished package
- **Assembly Orders** track the assembly process

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── movements/
│   │   ├── locations/
│   │   └── assembly/
│   ├── dashboard/        # Dashboard pages
│   │   ├── products/
│   │   ├── inbound/
│   │   ├── outbound/
│   │   ├── inventory/
│   │   ├── assembly/
│   │   ├── locations/
│   │   └── movements/
│   ├── layout.tsx
│   └── page.tsx
├── actions/              # Server Actions
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── forms/           # Form components
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── utils.ts         # Utility functions
│   ├── query-client.tsx # React Query provider
│   └── validations/     # Zod schemas
├── types/
│   └── database.ts      # TypeScript types
supabase/
└── migrations/          # SQL migration files
```

## Deployment to Vercel

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Security

- Row Level Security (RLS) enabled on all Supabase tables
- Input validation with Zod on both client and server
- SQL injection prevention through Supabase's parameterized queries
- XSS prevention through React's built-in escaping

## License

Private - EcoGiving
