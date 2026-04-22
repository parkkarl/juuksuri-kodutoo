# Koodistandard

Selle projekti koodistandard on fikseeritud kirjalikult ja automaatselt
tööriista abil jõustatud.

## Tööriist

[**Biome**](https://biomejs.dev) (`biome.json` repos) — ühtne formaater
+ linter. Käivitatav `bun run check` (ainult kontroll) või
`bun run format` (automaatne parandus).

Biome on valitud seetõttu, et ta:
- formaadib **ja** lindib ühes tööriistas (ei pea ESLint + Prettier eraldi)
- töötab kiirelt (kirjutatud Rustis)
- on konfigureeritud ühes JSON-failis (`biome.json`)

## Kokkulepped

### Formaat (Biome jõustab)
- Taanded: **2 tühikut**, mitte tab-id
- Rea maksimaalne pikkus: **100 märki**
- Reavahetused: **LF** (Unix), mitte CRLF
- Jutumärgid JavaScriptis/TypeScriptis: **topelt** (`"foo"`, mitte `'foo'`)
- Semikoolonid: **alati**
- Trailing comma: **alati** (multi-line)
- Arrow-funktsiooni sulud: **alati** (`(x) => x`, mitte `x => x`)

### TypeScript
- `strict: true` (vt `tsconfig.json`)
- `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`,
  `noUnusedParameters` kõik sisse lülitatud — mittekasutatud kood
  põhjustab kompileerimisvea
- Kasutame ESM moodulite importi (`import … from "…"`), mitte CommonJS
- Path alias `~/` viitab `src/` kaustale (vt `tsconfig.json`)

### Nimetamise reeglid
| Asi                        | Stiil               | Näide |
|----------------------------|---------------------|-------|
| Failid                     | kebab-case          | `booking-page.tsx`, `security-headers.ts` |
| Komponendid (JSX)          | PascalCase          | `BookingPage`, `AdminLoginPage` |
| Funktsioonid, muutujad     | camelCase           | `createBooking`, `selectedDate` |
| Tüübid ja liidesed         | PascalCase          | `Barber`, `CreateBookingInput` |
| Andmebaasi veerud          | snake_case          | `start_time`, `customer_name` |
| Konstandid                 | UPPER_SNAKE_CASE    | `SLOT_MINUTES`, `SESSION_COOKIE` |

### Kaustastruktuur

Vt `README.md` — MVC jaotus `src/` all. Iga fail kuulub täpselt ühte
rolli (kontroller / mudel / vaade / middleware / utiliit), ega segu
ülesandeid.

### Kommentaarid

Kommentaar kirjeldab **miks**, mitte **mis**. Iga mitte-triviaalse
loogika-lõigu juures (nt topeltbroneeringu kaitse, CSRF muster, anti-
user-enumeration) on 1–3 rea kommentaar, mis selgitab põhjust.

### Lokaliseerimine

Rakenduse UI ja kasutajale suunatud tekstid on **eesti keeles**. Koodi
kommentaarid ja sisemised muutujate nimed on eesti keeles (või
tehnilised ingliskeelsed terminid nt `session`, `middleware`,
`slot`), et oleks loetav projekti kontekstis.

### Imports

Imporditakse alati nimeliselt (`import { foo } from "…"`), välja
arvatud kus pakett pakub ainult `default` ekspordi. Importide
järjestus (Biome jõustab automaatselt):
1. Välised sõltuvused
2. Sisemised (`~/` aliasiga) moodulid

## Kuidas standardit kontrollitakse

Lokaalselt:
```bash
bun run check       # lint + format kontroll (ei muuda faile)
bun run format      # rakenda format
```

Enne commit'i peab `bun run check` olema veata ja TypeScript
(`bunx tsc --noEmit`) peab samuti olema veata.
