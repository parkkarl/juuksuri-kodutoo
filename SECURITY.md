# Turvalisuse ülevaade

See dokument loetleb peamised ründevektorid, mis on selle
broneerimissüsteemi kontekstis asjakohased, ning iga kaitsemeetme
konkreetse asukoha koodis.

## 1. SQL-süstimine

**Oht:** pahatahtlik kasutaja sisestab vormi SQL-fragmente (`'; DROP TABLE...`),
mis võiksid muuta andmebaasi struktuuri või lugeda salastatud andmeid.

**Kaitse:** Kõik andmebaasi-päringud kasutavad `postgres`-teegi *template
literal* süntaksit, mis on **parameteriseeritud** (prepared statement-id
kulisside taga) — kasutaja sisend läheb alati parameetrina, mitte SQL
tekstina.

Vt näiteks `src/models/booking.model.ts:43`:
```ts
await sql`
  INSERT INTO bookings (barber_id, start_time, …)
  VALUES (${input.barberId}, ${input.startTime}, …)
`;
```

Ei kusagil ei konkatineerita kasutaja-sisendit SQL-stringi otse.

## 2. Topeltbroneering (race condition / äriloogika)

**Oht:** kaks kasutajat vajutavad "Broneeri" samal mikrosekundil sama
slot'i peale — ilma kaitseta tekiks kaks kattuvat kirjet.

**Kaitse:** `UNIQUE (barber_id, start_time)` constraint andmebaasis
(`src/db/migrations/001_init.sql:16`). Kui kaks INSERT-i teevad samal
ajal, üks õnnestub ja teine saab `unique_violation` (SQLSTATE 23505),
mida kontroller tuvastab ja tagastab kasutajale "aeg on vahepeal
broneeritud" (`src/models/booking.model.ts:45`).

See on **atomaarne** (PostgreSQL transaktsioonide garantii), ei vaja
rakenduskihilist lukustust ning toimib korrektselt ka horisontaalselt
skaleerudes (mitu app-konteinerit sama DB vastu).

## 3. Cross-Site Scripting (XSS)

**Oht:** pahatahtlik kasutaja sisestab `<script>…</script>` klient/juuksuri
nimesse, mis seejärel admin-vaates JavaScriptina käivitub.

**Kaitse:** Hono JSX renderdaja **auto-escape'ib** kõik dünaamilised
väärtused (`{variable}` sees). Näiteks `<td>{b.customer_name}</td>`
toodab `&lt;script&gt;…&lt;/script&gt;` — ohutu tekstina.

Lisaks `Content-Security-Policy` päis (`src/middleware/security-headers.ts`)
blokeerib inline-JS-i ja välise JS-i (`script-src 'self'`).

## 4. Cross-Site Request Forgery (CSRF)

**Oht:** ründaja meelitab sisse loginud admini klõpsama välist linki, mis
esitab taustal POST-päringu (nt sessiooni lõpetamine, andmete muutmine)
admini brauserist.

**Kaitse:** Double-submit cookie muster
(`src/middleware/csrf.ts`):
1. Iga sessiooni ajal genereeritakse juhuslik CSRF token ja pannakse see
   `juuksur_csrf` cookie'sse (SameSite=Lax).
2. Vorm sisaldab peidetud välja `_csrf` sama väärtusega.
3. Server kontrollib iga mutating-päringu (POST/PUT/DELETE) korral, et
   cookie ja vorm kattuvad. Kui ei — HTTP 403.

Võrdlus on ajakonstantne (`timingSafeEqual`), mis takistab timing-
rünnakuid.

Testitud: POST ilma CSRF tokenita tagastab 403.

## 5. Õigusteta ligipääs admin-vaatele

**Oht:** ilma autentimiseta saaks keegi lugeda klientide isikuandmeid
(nimi, telefon, e-post).

**Kaitse:**
- Parool on salvestatud bcrypt-räsi kujul (cost 12,
  `src/db/seed.ts:26`). Plaintext parool andmebaasi ei jõua.
- Võrdlus on ajakonstantne — **lisaks** teeme dummy-võrdluse ka siis,
  kui kasutajanimi ei eksisteeri (`src/models/admin.model.ts:25`), et
  hoida vastuste aeg ühtlane (anti-user-enumeration).
- Sessioon on serveripoolne (tabel `sessions`): cookie hoiab ainult
  juhuslikku 256-bit session ID-d, tegelikud andmed jäävad DB-sse.
  Logout kustutab kirje DB-st.
- Middleware `requireAdmin` (`src/middleware/auth.ts`) suunab ilma
  sessioonita kasutaja login-lehele. Kõik `/admin/bookings` ja teised
  admin-marsruudid on selle taga.

## 6. Session cookie rünnakud

**Oht:** XSS kaudu cookie varastamine, man-in-the-middle ülekandel,
CSRF.

**Kaitse:**
- `HttpOnly` — JavaScript ei saa cookie'd lugeda
- `Secure` (production'is) — ainult HTTPS üle
- `SameSite=Lax` — teistest saitidest algatatud POST-id cookie'd kaasa
  ei võta
- 12h aegumisaeg + DB-s eraldi `expires_at`, mis kontrollitakse igal
  päringul

## 7. Sisendi valideerimine

**Oht:** ebasobivad andmed (liiga pikk nimi, sobimatu e-post, sobimatu
kuupäev) võivad tekitada vigu või halvendada andmete kvaliteeti.

**Kaitse:** Kogu sisend valideeritakse **Zod** skeemiga vormide tasemel
(`src/controllers/public.controller.tsx:bookingSchema`). Piirangud:
- `customerName`: 2–100 märki, trimmitud
- `customerPhone`: 5–30 märki, regex `[0-9+\s\-()]+`
- `customerEmail`: kehtiv e-post või tühi, max 200 märki
- `barberId`: positiivne täisarv
- `startTime`: ISO 8601 datetime-string
- `date`: `YYYY-MM-DD` formaadis

Lisaks serveri äriloogika kontrollib:
- Slot peab olema tööaja sees (10:00–18:00) ja 30-min ridadel
- Algusaeg peab olema **tulevikus** (ei saa broneerida minevikku)
- Juuksur peab andmebaasis eksisteerima

## 8. Brauseri turvapäised

`src/middleware/security-headers.ts` lisab igale vastusele:

| Päis                                | Eesmärk |
|-------------------------------------|---------|
| `X-Content-Type-Options: nosniff`   | Brauser ei "oleta" MIME tüüpi |
| `X-Frame-Options: DENY`             | Leht ei lase end iframe'ida (clickjacking) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Vähendab välise lingi kaudu lekkivat konteksti |
| `Content-Security-Policy: …`        | Piirab mis ressursid võivad laadida (`script-src 'self'` blokib inline ja 3rd party JS-i) |

## 9. HTTPS

Cloudflare Tunnel lõpetab TLS-i Cloudflare'i servas ja edastab liikluse
sisemise tunneli kaudu serverisse. Kasutaja-poolses ühenduses on alati
HTTPS. Cookie-d on produktsioonis `Secure`-lipuga, mis takistab nende
saatmist lahtise HTTPi üle.

## 10. Logimine ja veahaldus

`src/middleware/logger.ts` logib iga päringu (meetod, tee, staatus,
kestus) ilma tundlikke andmeid (parool, session ID) välja kirjutamata.
Vead logitakse `app.onError`-s, aga kasutajale näidatakse ainult üldine
veateade — sisemised detailid ei leki.

---

## Kokkuvõte: ründevektorite ja kaitsemeetmete kaart

| # | Ründevektor             | Kaitsemeede selles töös                              |
|---|-------------------------|------------------------------------------------------|
| 1 | SQL-süstimine           | Parameteriseeritud päringud (postgres lib)           |
| 2 | Topeltbroneering        | UNIQUE (barber_id, start_time) + äriloogika kontroll |
| 3 | XSS                     | JSX auto-escape + CSP                                |
| 4 | CSRF                    | Double-submit cookie + timingSafeEqual võrdlus       |
| 5 | Õigusteta admin-ligipääs | bcrypt paroolid + server-side sessioonid + guard     |
| 6 | Session hijack          | HttpOnly + Secure + SameSite=Lax + DB-expiry         |
| 7 | Ebasobivad sisendid     | Zod skeem + äriloogika kontroll                      |
| 8 | Clickjacking / MIME     | X-Frame-Options, X-Content-Type-Options, CSP         |
| 9 | MITM                    | HTTPS Cloudflare Tunneli kaudu                       |
|10 | Info leke logidest      | Selektiivne logimine, geneetline veateade kasutajale |
