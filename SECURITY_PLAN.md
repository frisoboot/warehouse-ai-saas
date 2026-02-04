# Beveiligingsplan: EcoGiving Warehouse Management System

## Huidige Situatie (KRITIEK)

Het systeem heeft momenteel **geen enkele vorm van authenticatie of autorisatie**:

- Alle routes zijn publiek toegankelijk (`/dashboard/*`)
- Alle API endpoints staan open (`/api/*`)
- Server Actions hebben geen auth-checks
- RLS policies staan op `USING (true)` — iedereen kan alles
- Supabase client gebruikt alleen de anon key zonder user context
- Geen sessie-management, geen gebruikersbeheer

---

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────┐   ┌───────────┐   ┌──────────────────────────┐   │
│  │  Login   │   │  Signup   │   │  Dashboard (protected)   │   │
│  │  Page    │   │  Page     │   │  - products, inventory   │   │
│  └────┬─────┘   └─────┬─────┘   │  - movements, assembly   │   │
│       │               │         └────────────┬─────────────┘   │
│       └───────┬───────┘                      │                 │
│               ▼                              ▼                 │
│     Supabase Auth (PKCE)          Supabase Client (RLS)        │
└───────────────┬──────────────────────────────┬─────────────────┘
                │                              │
┌───────────────▼──────────────────────────────▼─────────────────┐
│                     NEXT.JS SERVER                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Middleware (middleware.ts)                               │   │
│  │  - Valideert sessie bij elk request                      │   │
│  │  - Redirect naar /login als niet ingelogd               │   │
│  │  - Refresh tokens automatisch                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Server Actions   │  │  API Routes      │                    │
│  │  (met auth check) │  │  (met auth check)│                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           └──────────┬──────────┘                               │
│                      ▼                                          │
│           Supabase Server Client                                │
│           (user context → RLS)                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                     SUPABASE                                     │
│                                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Auth      │  │  Database   │  │  Row Level Security      │  │
│  │  - Users   │  │  - Products │  │  - Policies per role     │  │
│  │  - Sessions│  │  - Inventory│  │  - auth.uid() checks     │  │
│  │  - MFA     │  │  - Movements│  │  - role-based filtering  │  │
│  │  - PKCE    │  │  - etc.     │  │                          │  │
│  └────────────┘  └─────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Supabase Auth Basis + SSR Setup

### 1.1 Dependencies installeren

```bash
npm install @supabase/ssr
```

Dit is het officiële Supabase SSR pakket voor Next.js. Het vervangt de losse `@supabase/supabase-js` client met cookie-based sessie management.

### 1.2 Supabase Client Refactoren

**Drie aparte clients nodig:**

| Client | Doel | Waar |
|--------|------|------|
| `createBrowserClient` | Client-side (React components) | `src/lib/supabase/client.ts` |
| `createServerClient` | Server-side (Server Components, Actions, Route Handlers) | `src/lib/supabase/server.ts` |
| `createMiddlewareClient` | Middleware (token refresh) | `src/lib/supabase/middleware.ts` |

**`src/lib/supabase/client.ts`** — Browser client:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`** — Server client (cookies-based):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**`src/lib/supabase/middleware.ts`** — Middleware client:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh sessie — dit moet ALTIJD aangeroepen worden
  const { data: { user } } = await supabase.auth.getUser();

  // Niet ingelogd en probeert beschermde route te bezoeken
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Ingelogd en probeert login pagina te bezoeken
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### 1.3 Next.js Middleware

**`src/middleware.ts`**:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Alle routes behalve static files en Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Waarom dit veilig is:**
- `getUser()` valideert het JWT token server-side bij Supabase (niet lokaal)
- Tokens worden automatisch gerefresht via cookies
- PKCE flow voorkomt authorization code interception
- Cookies zijn HttpOnly → niet toegankelijk via JavaScript (XSS-bestendig)

---

## Fase 2: Login & Registratie Pagina's

### 2.1 Login Page (`/login`)

Implementeer op `src/app/login/page.tsx`:

- E-mail + wachtwoord login via `supabase.auth.signInWithPassword()`
- Formulier validatie met Zod
- Error handling (verkeerd wachtwoord, account bestaat niet)
- Redirect naar `/dashboard` na succesvolle login
- Link naar registratie pagina

### 2.2 Registratie Page (`/signup`)

Implementeer op `src/app/signup/page.tsx`:

- E-mail + wachtwoord registratie via `supabase.auth.signUp()`
- Wachtwoord sterkte-eisen (min. 8 tekens, mix van hoofdletters/kleine letters/cijfers)
- E-mail bevestiging flow (Supabase stuurt automatisch een verificatie e-mail)
- Zod validatie schema

### 2.3 Auth Callback Route

**`src/app/auth/callback/route.ts`** — Verwerkt de e-mail verificatie link:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

### 2.4 Logout

Server Action in `src/actions/auth.ts`:
```typescript
"use server"
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

### 2.5 Supabase Auth Configuratie (Dashboard)

In het Supabase dashboard configureer:

- **Site URL**: productie URL instellen
- **Redirect URLs**: `http://localhost:3000/auth/callback` + productie URL
- **E-mail templates**: Nederlandse templates voor verificatie/reset
- **Wachtwoord beleid**: Minimaal 8 tekens
- **Rate limiting**: Supabase heeft dit ingebouwd (standaard goed)
- **CAPTCHA**: Overweeg Cloudflare Turnstile (optioneel, Supabase supported dit)

---

## Fase 3: Row Level Security (RLS) Dichttimmeren

Dit is de **belangrijkste beveiligingslaag**. Zelfs als iemand direct met de Supabase API praat (buiten de app om), beschermen RLS policies de data.

### 3.1 Gebruikersprofielen Tabel

Nieuwe migratie: `00002_auth_and_rls.sql`:

```sql
-- Gebruikersprofielen tabel (gelinkt aan Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'manager', 'warehouse_worker', 'viewer')),
  warehouse_access TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Gebruikers kunnen hun eigen profiel lezen
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins kunnen alle profielen beheren
CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Automatisch profiel aanmaken bij registratie
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.2 Helper Functie voor Rolcontrole

```sql
-- Functie om de rol van de huidige gebruiker op te halen
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 3.3 Strikte RLS Policies

**Vervang ALLE bestaande `USING (true)` policies:**

```sql
-- ============================================================
-- PRODUCTS: Iedereen mag lezen, alleen manager+ mag schrijven
-- ============================================================
DROP POLICY "Allow all operations on products" ON products;

CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can insert products" ON products
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Managers can update products" ON products
  FOR UPDATE USING (
    public.get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete products" ON products
  FOR DELETE USING (
    public.get_user_role() = 'admin'
  );

-- ============================================================
-- LOCATIONS: Iedereen mag lezen, alleen manager+ mag wijzigen
-- ============================================================
DROP POLICY "Allow all operations on locations" ON locations;

CREATE POLICY "Authenticated users can view locations" ON locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage locations" ON locations
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager')
  ) WITH CHECK (
    public.get_user_role() IN ('admin', 'manager')
  );

-- ============================================================
-- INVENTORY: Iedereen mag lezen, workers+ mogen muteren
-- ============================================================
DROP POLICY "Allow all operations on inventory" ON inventory;

CREATE POLICY "Authenticated users can view inventory" ON inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can manage inventory" ON inventory
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'warehouse_worker')
  ) WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'warehouse_worker')
  );

-- ============================================================
-- MOVEMENTS: Iedereen mag lezen, workers+ mogen aanmaken
-- ============================================================
DROP POLICY "Allow all operations on movements" ON movements;

CREATE POLICY "Authenticated users can view movements" ON movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can create movements" ON movements
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'warehouse_worker')
  );

-- Movements mogen NOOIT gewijzigd of verwijderd worden (audit trail)
-- Geen UPDATE of DELETE policies = onmogelijk

-- ============================================================
-- ASSEMBLIES: Iedereen mag lezen, managers mogen beheren
-- ============================================================
DROP POLICY "Allow all operations on assemblies" ON assemblies;

CREATE POLICY "Authenticated users can view assemblies" ON assemblies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage assemblies" ON assemblies
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager')
  ) WITH CHECK (
    public.get_user_role() IN ('admin', 'manager')
  );

-- ============================================================
-- ASSEMBLY ORDERS: Iedereen mag lezen, workers+ mogen beheren
-- ============================================================
DROP POLICY "Allow all operations on assembly_orders" ON assembly_orders;

CREATE POLICY "Authenticated users can view assembly_orders" ON assembly_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can manage assembly orders" ON assembly_orders
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'warehouse_worker')
  ) WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'warehouse_worker')
  );
```

### 3.4 Movements tabel: Audit Trail met user_id

```sql
-- Voeg user tracking toe aan movements
ALTER TABLE movements ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Automatisch user_id invullen bij nieuwe movements
CREATE OR REPLACE FUNCTION set_movement_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_movement_user
  BEFORE INSERT ON movements
  FOR EACH ROW EXECUTE FUNCTION set_movement_user_id();
```

---

## Fase 4: Server Actions & API Routes Beveiligen

### 4.1 Auth Guard Helper

**`src/lib/auth.ts`**:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { user, supabase };
}

export async function requireRole(allowedRoles: string[]) {
  const { user, supabase } = await requireAuth();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error("Onvoldoende rechten");
  }

  return { user, supabase, role: profile.role };
}
```

### 4.2 Server Actions Patroon

Elke server action moet beginnen met auth-validatie:

```typescript
"use server"
import { requireAuth, requireRole } from "@/lib/auth";

export async function createProduct(data: ProductInput) {
  const { supabase } = await requireRole(["admin", "manager"]);

  // Zod validatie...
  // Database operatie met geauthenticeerde supabase client...
  // RLS beschermt ook als dubbele beveiliging
}
```

### 4.3 API Routes Patroon

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Supabase queries draaien nu met user context → RLS actief
}
```

---

## Fase 5: Frontend Auth Context

### 5.1 Auth Provider

**`src/components/providers/auth-provider.tsx`**:
```typescript
"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        router.refresh(); // Refresh server components
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 5.2 Dashboard Layout met User Info

De sidebar krijgt:
- Gebruikersnaam + avatar bovenaan
- Rolweergave (admin/manager/worker/viewer)
- Uitlog knop
- Menu-items gebaseerd op rol (bijv. viewer ziet geen "delete" knoppen)

---

## Fase 6: Rolgebaseerd Toegangssysteem

### Rollen Matrix

| Actie | Admin | Manager | Worker | Viewer |
|-------|-------|---------|--------|--------|
| **Products** bekijken | Ja | Ja | Ja | Ja |
| Products aanmaken/wijzigen | Ja | Ja | Nee | Nee |
| Products verwijderen | Ja | Nee | Nee | Nee |
| **Inventory** bekijken | Ja | Ja | Ja | Ja |
| Inventory muteren | Ja | Ja | Ja | Nee |
| **Movements** bekijken | Ja | Ja | Ja | Ja |
| Movements aanmaken | Ja | Ja | Ja | Nee |
| Movements wijzigen/verwijderen | Nee | Nee | Nee | Nee |
| **Locations** beheren | Ja | Ja | Nee | Nee |
| **Assembly** beheren | Ja | Ja | Ja | Nee |
| **Gebruikers** beheren | Ja | Nee | Nee | Nee |
| **Instellingen** | Ja | Nee | Nee | Nee |

---

## Fase 7: Extra Beveiligingsmaatregelen

### 7.1 Multi-Factor Authentication (MFA)

Supabase ondersteunt TOTP-based MFA (Google Authenticator, Authy, etc.):

```typescript
// MFA enrollment
const { data } = await supabase.auth.mfa.enroll({
  factorType: "totp",
  friendlyName: "Authenticator App",
});

// MFA verificatie bij login
const { data: challengeData } = await supabase.auth.mfa.challenge({
  factorId: factor.id,
});

await supabase.auth.mfa.verify({
  factorId: factor.id,
  challengeId: challengeData.id,
  code: userTOTPCode,
});
```

**Aanbeveling**: Verplicht MFA voor admin en manager rollen.

### 7.2 Wachtwoord Reset Flow

Volledig via Supabase:

```typescript
// Stuur reset e-mail
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/callback?next=/reset-password`,
});

// Nieuw wachtwoord instellen (na callback)
await supabase.auth.updateUser({ password: newPassword });
```

Vereist een `/reset-password` pagina in de app.

### 7.3 Sessie Beveiliging

Supabase regelt dit grotendeels, maar configureer:

- **JWT expiry**: 3600 seconden (1 uur) — standaard, goed genoeg
- **Refresh token rotation**: Ingeschakeld (standaard)
- **Refresh token reuse interval**: 10 seconden (standaard)

### 7.4 Rate Limiting op API Routes

```typescript
// Simpele in-memory rate limiter voor API routes
// Voor productie: gebruik Vercel Edge Middleware of Upstash Rate Limit
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

### 7.5 Security Headers

In `next.config.mjs`:
```javascript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co;",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];
```

---

## Implementatievolgorde

| # | Stap | Prioriteit | Risico zonder |
|---|------|-----------|---------------|
| 1 | `@supabase/ssr` installeren + client refactoren | KRITIEK | Geen auth mogelijk |
| 2 | Middleware aanmaken (route bescherming) | KRITIEK | Alle routes publiek |
| 3 | Login/signup pagina's bouwen | KRITIEK | Geen toegangscontrole |
| 4 | Auth callback route | KRITIEK | E-mail verificatie werkt niet |
| 5 | `user_profiles` tabel + trigger | HOOG | Geen rolsysteem |
| 6 | RLS policies vervangen | KRITIEK | Database staat open |
| 7 | Server Actions beveiligen | HOOG | Backend omzeild |
| 8 | API Routes beveiligen | HOOG | API misbruik mogelijk |
| 9 | Auth Provider + sidebar user info | MEDIUM | Slechte UX |
| 10 | Rolgebaseerde UI (knoppen verbergen) | MEDIUM | Verwarrende UX |
| 11 | Wachtwoord reset flow | MEDIUM | Gebruikers locked out |
| 12 | MFA implementatie | HOOG | Account compromise risico |
| 13 | Security headers | MEDIUM | XSS/clickjacking risico |
| 14 | Rate limiting | MEDIUM | DDoS/brute force risico |
| 15 | Audit logging (user_id in movements) | LAAG | Geen traceerbaarheid |

---

## Wat Supabase voor ons doet (gratis)

- Gebruikersbeheer (registratie, login, e-mail verificatie)
- JWT token management (aanmaken, valideren, refreshen)
- Wachtwoord hashing (bcrypt, server-side)
- PKCE auth flow (veiligste OAuth flow)
- MFA/TOTP ondersteuning
- Row Level Security engine
- Rate limiting op auth endpoints
- E-mail templates (verificatie, reset)
- Refresh token rotation
- Session management via cookies
- CORS configuratie
- SSL/TLS voor alle connecties

**Wij moeten zelf doen:**
- Next.js middleware schrijven
- Login/signup UI bouwen
- RLS policies definiëren
- Server Actions/API routes beveiligen
- Auth context provider bouwen
- Security headers configureren

---

## Samenvatting

Dit plan implementeert **defense in depth** — meerdere beveiligingslagen die elk onafhankelijk beschermen:

1. **Laag 1 — Middleware**: Blokkeert ongeauthenticeerde requests
2. **Laag 2 — Server-side validatie**: `getUser()` in elke server action/route
3. **Laag 3 — RLS**: Database weigert queries zonder geldige auth token
4. **Laag 4 — Rolcontrole**: Fijnmazige permissies per gebruikersrol
5. **Laag 5 — MFA**: Tweede factor voor gevoelige rollen
6. **Laag 6 — Headers**: Browser-level bescherming tegen XSS/clickjacking

Zelfs als één laag faalt, beschermen de andere lagen de applicatie.
