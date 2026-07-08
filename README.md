# OneGiftLink — App MVP

App per generare link regalo brandizzati, raccogliere dati creator e tracciare le spedizioni.

Stack: React + TypeScript + Vite, Supabase (auth + database + storage), Tailwind

---

## PRIMA DI TUTTO: 2 configurazioni su Supabase

Lo schema del database e' gia' creato. Mancano due cose nella dashboard Supabase:

### 1. Creare il bucket per i loghi (Storage)

1. Supabase -> Storage -> New bucket
2. Nome: logos
3. Spunta "Public bucket"
4. Create

Poi Storage -> logos -> Policies -> New policy -> For full customization, crea due policy:

Policy 1 (upload): operation INSERT, role authenticated, expression: true
Policy 2 (update): operation UPDATE, role authenticated, expression: true

### 2. URL di redirect per la conferma email

1. Supabase -> Authentication -> URL Configuration
2. Site URL: in locale http://localhost:5173 ; in produzione il tuo dominio
3. Redirect URLs: aggiungi lo stesso URL

---

## Configurare le chiavi (in locale)

1. Copia .env.example in .env
2. Inserisci le chiavi da Supabase -> Settings -> API:
   VITE_SUPABASE_URL = Project URL
   VITE_SUPABASE_ANON_KEY = anon public key (NON la service_role)

npm install
npm run dev

---

## Deploy (Cloudflare Pages, come la landing)

1. Codice su GitHub
2. Cloudflare Pages -> Connect to Git -> repo
3. Build command: npm run build ; Output directory: dist
4. Environment variables: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
5. Deploy

Dopo il deploy: torna su Supabase -> Authentication -> URL Configuration e metti il dominio di produzione.

Il file public/_redirects (Cloudflare) e vercel.json (Vercel) gestiscono gia' il routing delle pagine tipo /g/token.

---

## Come funziona

BRAND:
1. Si registra (email + password + conferma email)
2. Dashboard -> completa setup (logo + nome)
3. Crea campagna con prodotti (nome, colori, taglie)
4. Genera link per un creator (@handle) -> copia
5. Manda in DM, vede stato in tabella, marca "postato", esporta CSV

CREATOR (nessun login):
1. Apre /g/token
2. Pagina brandizzata -> sceglie prodotto/colore/taglia -> indirizzo -> conferma

---

## Fase 2 (non ancora incluso)
- Login Google (attivabile in Supabase -> Authentication -> Providers)
- Follow-up automatici
- Database reputazione creator (il campo posted e' gia' il seme)
- Integrazione Shopify (per ora export CSV)
- Pricing / Stripe
