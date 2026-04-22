# Juuksurisalongi broneerimissüsteem

TAK25 kodutöö. Minimaalne, avalikult kättesaadav broneerimissüsteem, mis
välistab topeltbroneeringud sama juuksuri samale ajale — ka samaaegsete
päringute korral.

**Avalik URL:** https://juuksur.kalaradar.ee

---

## Klient-server: backend ja frontend

Rakendus järgib klassikalist klient-server arhitektuuri, kus suhtlus käib
HTTPS üle. **Frontend** on kasutaja brauseris renderdatud HTML + CSS
(server-side JSX), mida kasutaja täidab vormide kaudu. **Backend** on
Bun runtime'is töötav Hono-põhine HTTP server, mis võtab vastu päringuid,
töötleb äriloogikat, suhtleb PostgreSQL andmebaasiga ja tagastab vastused
kas HTML-lehena (täis-lehe refresh, vormi GET/POST muster) või ümber-
suunamisena (302 redirect).

Näide broneerimise voost:

1. Klient laeb `GET /` → server tagastab HTML-i juuksurite valikuga.
2. Klient valib juuksuri + kuupäeva → `GET /?barberId=1&date=…` → server
   arvutab vabad aegu (andmebaasist + tööaja reeglitest) ja tagastab HTML.
3. Klient esitab vormi → `POST /book` koos CSRF tokeniga → server
   valideerib, kirjutab andmebaasi (atomaarselt), tagastab kinnituse HTML.

Andmebaas ei ole kliendile otse kättesaadav — ainult backend pääseb
ligi (eraldi Docker konteiner, kuulab ainult sisemises võrgus).

## Kasutatud raamistik: Hono

[Hono](https://hono.dev) on minimaalne, kiire web-raamistik, mis töötab
Bun/Node/Cloudflare Workers jne runtime'idel. Raamistiku tunnused, mis
ta raamistikuks teevad:

- Marsruutimine (`app.get`, `app.post`, `app.route`)
- Middleware-ahel (`app.use`) — nt sessiooni laadimine, CSRF kontroll,
  turvapäised, logimine
- Päringu/vastuse abstraktsioon Context-objekti (`c.req`, `c.html`,
  `c.redirect`, `c.json`) kaudu
- Vea- ja 404-käsitlus (`app.onError`, `app.notFound`)
- JSX server-side renderdamine (Hono sisseehitatud `jsx` pragma)

Hono on struktuurselt **MVC**-sõbralik: marsruudi-handler (kontroller)
kasutab mudeleid (`src/models/`) andmete jaoks ja vaatefaile
(`src/views/`) HTML-vastuste jaoks.

## MVC eristus

```
src/
├── controllers/       # Päringute käsitlemine (äriloogika)
│   ├── public.controller.tsx
│   └── admin.controller.tsx
├── models/            # Andmetega töötamine (SQL päringud)
│   ├── barber.model.ts
│   ├── booking.model.ts
│   ├── admin.model.ts
│   └── session.model.ts
├── views/             # Kasutajale kuvamine (JSX templates)
│   ├── layout.tsx
│   ├── booking-page.tsx
│   ├── confirmation-page.tsx
│   ├── admin-login.tsx
│   ├── admin-bookings.tsx
│   └── error-page.tsx
├── middleware/        # Korduvkasutatavad moodulid
│   ├── session.ts
│   ├── csrf.ts
│   ├── auth.ts
│   ├── logger.ts
│   └── security-headers.ts
├── utils/             # Puhaste funktsioonidega abimoodulid
│   ├── time.ts
│   └── csrf.ts
├── db/                # Andmebaasi-kiht
│   ├── client.ts
│   ├── migrate.ts
│   ├── seed.ts
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_seed_barbers.sql
├── config.ts          # Tsentraalne env-muutujate loomine
└── index.tsx          # Rakenduse sisenemispunkt
```

**Kontroller** (`public.controller.tsx`) võtab vastu päringu, kutsub
mudelit (`createBooking`), kutsub vaate (`<BookingPage />` või
`<ConfirmationPage />`) ja tagastab HTMLi. Kontroller ei kirjuta SQL-i
ise; mudel ei genereeri HTML-i. Vaade ei tea, kust andmed tulid.

## Topeltbroneeringu tõke (kohustuslik nõue)

Kahekihiline kaitse:

1. **Äriloogika kontroll** (`public.controller.tsx`): enne INSERT-i
   kontrollitakse, et slot on kehtival tööajal ja tulevikus.
2. **Andmebaasi UNIQUE constraint** (`001_init.sql`):
   ```sql
   CONSTRAINT bookings_barber_start_unique UNIQUE (barber_id, start_time)
   ```
   PostgreSQL tagab atomaarselt, et kahte kirjet sama (juuksur, algusaeg)
   paariga olla ei saa. Kui kaks päringut saabuvad samal mikrosekundil,
   üks INSERT õnnestub ja teine tagastab `unique_violation` (SQLSTATE
   23505). Kontroller tuvastab seda ja näitab kasutajale sõbraliku
   veateate. See muudab topeltbroneeringu füüsiliselt võimatuks — ka
   race condition'i korral.

Seda on testitud 20 paralleelse päringuga sama slot'i peale: täpselt
1 õnnestus, 19 said 400 vea. Vt `SECURITY.md`.

## Turvalisus

Vt eraldi [SECURITY.md](./SECURITY.md).

## Koodistandard

Vt eraldi [STYLEGUIDE.md](./STYLEGUIDE.md).

Automaatne kontroll: `bun run check` (Biome — format + lint).

---

## Lokaalne arendamine

**Eeldused:** Bun 1.3+, PostgreSQL (või Docker/Podman).

```bash
# 1. Sõltuvused
bun install

# 2. Käivita Postgres (podman näide)
podman run -d --name juuksur-db-dev \
  -e POSTGRES_DB=juuksur -e POSTGRES_USER=juuksur -e POSTGRES_PASSWORD=juuksur_dev_pw \
  -p 127.0.0.1:5435:5432 docker.io/library/postgres:16-alpine

# 3. Loo .env.local
cat > .env.local <<EOF
NODE_ENV=development
PORT=3100
DATABASE_URL=postgres://juuksur:juuksur_dev_pw@127.0.0.1:5435/juuksur
SESSION_SECRET=$(openssl rand -base64 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
EOF

# 4. Migratsioonid + admin seed
bun --env-file=.env.local run src/db/migrate.ts
bun --env-file=.env.local run src/db/seed.ts

# 5. Käivita dev server (hot reload)
bun --env-file=.env.local run --hot src/index.tsx
# http://localhost:3100
```

## Deploy (Hetzner)

Teenust majutab Hetzneri VPS, millele on ette Cloudflare Tunnel.
Projekti kaust serveris: `/opt/juuksuri-kodutoo/`.

```bash
# Esmakordne setup serveris:
# 1. ssh hetzner
# 2. git clone https://github.com/parkkarl/juuksuri-kodutoo.git /opt/juuksuri-kodutoo
# 3. cd /opt/juuksuri-kodutoo
# 4. cp .env.example .env && vim .env   (täida paroolid)
# 5. bash deploy.sh

# Järgnevad deployd (koodimuudatuse järel):
ssh hetzner "cd /opt/juuksuri-kodutoo && bash deploy.sh"
```

Cloudflare Tunnel route `juuksur.kalaradar.ee` on lisatud
`/etc/cloudflared/config.yml` faili serveris (vt kalaradar-mono
CLAUDE.md-d üldise tunneli struktuuri kohta).

## Eemaldamine (hinnatud töö)

```bash
ssh hetzner "cd /opt/juuksuri-kodutoo && docker compose down -v && cd / && rm -rf /opt/juuksuri-kodutoo"
# Lisaks eemalda juuksur.kalaradar.ee ingress /etc/cloudflared/config.yml-st
# ja DNS kirje: cloudflared tunnel route dns --overwrite-dns <tunnel-id> <other-host>
```
