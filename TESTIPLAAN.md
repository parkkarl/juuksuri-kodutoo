# Testiplaan — Juuksurisalongi broneerimissüsteem

**Autor:** Karl
**Kuupäev:** 2026-05-22
**Rakendus:** Juuksurisalongi broneerimissüsteem
**Avalik URL:** https://juuksur.kalaradar.ee
**Versioon:** MVP (Bun + Hono, PostgreSQL)

---

## 1. Rakenduse kirjeldus

**Mis rakendus see on?**
Veebipõhine juuksurisalongi broneerimissüsteem. Klient saab veebilehel
valida juuksuri ja kuupäeva, näha vabu aegu ning broneerida endale sobiva
aja. Salongi töötaja (admin) saab eraldi sisselogimise taga vaadata kõiki
tehtud broneeringuid.

**Milleks rakendus mõeldud on?**
Asendada telefoni teel broneerimine — klient broneerib ise ööpäev läbi,
salong näeb broneeringuid koondvaates. Topeltbroneeringud on tehniliselt
välistatud.

**Olulisemad funktsioonid (≥3):**

1. **Vabade aegade kuvamine** — kui klient valib juuksuri ja kuupäeva,
   arvutab süsteem vabad 30-minutilised ajavahemikud tööajal 10:00–18:00
   (juba broneeritud ja möödunud ajad jäetakse välja).
2. **Aja broneerimine** — klient täidab vormi (nimi, telefon, valikuline
   e-post) ja valib vaba aja; õnnestumisel kuvatakse kinnitusleht.
3. **Topeltbroneeringu tõke** — sama juuksurit ei saa samale algusajale
   kaks korda broneerida (andmebaasi `UNIQUE` piirang).
4. **Admini sisse-/väljalogimine** — kasutajanime ja parooliga sessioon.
5. **Broneeringute haldusvaade** — admin näeb broneeringute loendit ja
   saab seda kuupäeva järgi filtreerida.

---

## 2. Testimise eesmärk

**Mida testimisega kontrollitakse?**
Kontrollitakse, et broneerimise põhitsükkel toimib algusest lõpuni: vabade
aegade kuvamine, broneeringu salvestamine, sisendi valideerimine,
topeltbroneeringu vältimine ning admini ligipääsu kaitse.

**Miks neid funktsioone on vaja testida?**

- **Broneerimine on rakenduse põhiväärtus** — kui see ei tööta, on kogu
  rakendus kasutu.
- **Topeltbroneering** tähendaks reaalses elus kahte klienti samal ajal
  ühe tooli juures → otsene äriline kahju ja usalduse kaotus.
- **Sisendi valideerimine** kaitseb andmebaasi rämpsandmete ja
  rünnakute eest (nt vigane telefoninumber, liiga lühike nimi).
- **Admini kaitse** tagab, et klientide kontaktandmeid (nimi, telefon,
  e-post) ei näe kõrvalised isikud.

---

## 3. Testjuhtumid

> **Eeltingimus kõigile:** rakendus töötab (`https://juuksur.kalaradar.ee`),
> andmebaasis on vähemalt üks juuksur (nt „Mari Tamm"). „Tuleviku kuupäev" =
> mõni tööpäev edaspidi, „möödunud aeg" = aeg, mis on praegusest varasem.

| Nr | Testi nimetus | Tüüp | Sammud | Oodatav tulemus | Tegelik tulemus | Märkused |
|----|---------------|------|--------|-----------------|-----------------|----------|
| T1 | Vabade aegade kuvamine | Tavaline | 1. Ava avaleht. 2. Vali juuksur „Mari Tamm". 3. Vali tuleviku kuupäev. 4. Vajuta „Näita vabu aegu". | Kuvatakse vabad 30-min ajad vahemikus 10:00–17:30. Möödunud ja broneeritud aegu ei kuvata. | | |
| T2 | Edukas broneering | Tavaline | 1. Vali juuksur ja tuleviku kuupäev, vajuta „Näita vabu aegu". 2. Vali vaba aeg (nt 11:00). 3. Sisesta nimi „Karl Park", telefon „+372 5123 4567", e-post `karl@naide.ee`. 4. Vajuta „Kinnita broneering". | Kuvatakse kinnitusleht („Broneering on kinnitatud!") juuksuri nime, aja ja kliendi nimega. Broneering on andmebaasis. | | |
| T3 | Broneering ilma e-postita | Tavaline / piir | 1. Tee broneering nagu T2, kuid jäta e-posti väli **tühjaks**. | Broneering õnnestub (e-post on valikuline väli). | | E-post on `optional`. |
| T4 | Topeltbroneering | Veaolukord | 1. Tee broneering ajale 11:00 (nagu T2). 2. Proovi sama juuksurit samale ajale 11:00 uuesti broneerida. | Broneering **ei õnnestu**. Kuvatakse teade „Valitud aeg on vahepeal broneeritud. Palun vali teine aeg." | | Andmebaasi `UNIQUE (barber_id, start_time)`. |
| T5 | Liiga lühike nimi | Veaolukord / valideerimine | 1. Täida vorm, kuid sisesta nimeks üks täht „K". 2. Vajuta „Kinnita broneering". | Broneeringut ei teki. Vorm kuvatakse uuesti veateatega (HTTP 400), sisestatud väljad säilivad. | | Nimi: min 2 märki. |
| T6 | Vigane telefoninumber | Veaolukord / valideerimine | 1. Täida vorm korrektselt, kuid telefoniks „helista mulle". 2. Vajuta „Kinnita broneering". | Broneeringut ei teki. Kuvatakse veateade „Telefoninumber sisaldab lubamatuid märke". | | Lubatud ainult `0-9 + tühik - ( )`, 5–30 märki. |
| T7 | Mineviku aja broneerimine | Veaolukord / piir | 1. Vali tänane kuupäev. 2. Proovi (nt URL-i / vormi muutes) broneerida juba möödunud kellaaega. | Broneeringut ei teki. Kuvatakse „Algusaeg peab olema tulevikus." | | Möödunud slote ei tohiks vormis kuvada — test kontrollib ka serveripoolset kaitset. Mineviku aeg peab olema kehtival slot-real (nt täna 10:00), muidu kuvatakse enne „Valitud aeg ei ole saadaval.". |
| T8 | Aeg väljaspool tööaega / valel real | Piir- / erijuht | 1. Saada broneering algusajaga 09:30, 18:00 või 10:15 (väljaspool slotte). | Broneeringut ei teki. Kuvatakse „Valitud aeg ei ole saadaval." | | Kehtivad ainult slotid 10:00–17:30 30-min sammuga. |
| T9 | Admin: vale parool | Veaolukord / turvalisus | 1. Ava `/admin/login`. 2. Sisesta kasutaja `admin`, parool „vale123". 3. Logi sisse. | Sisselogimine ebaõnnestub (HTTP 401). Teade „Vale kasutajanimi või parool." Ligipääsu ei anta. | | |
| T10 | Admin: kaitstud leht ilma sisselogimiseta | Erijuht / turvalisus | 1. Logi välja / kustuta küpsis. 2. Ava otse `/admin/bookings`. | Broneeringuid ei näidata; suunatakse sisselogimislehele `/admin/login`. | | Kontaktandmete kaitse. |
| T11 | Admin: edukas sisselogimine ja loend | Tavaline | 1. Ava `/admin/login`. 2. Sisesta õige kasutaja ja parool. 3. Logi sisse. | Suunatakse `/admin/bookings`. Kuvatakse broneeringute loend juuksuri nimedega. | | |
| T12 | Admin: kuupäeva filter | Tavaline / piir | 1. Logi adminina sisse. 2. Vali broneeringute vaates konkreetne kuupäev ja vajuta „Filtreeri". | Loendis on ainult selle kuupäeva broneeringud. Kuupäeval ilma broneeringuteta kuvatakse teade „Broneeringuid ei leitud.". | | |

---

## 4. Testitavate olukordade kokkuvõte

Testiplaan katab teadlikult kolme tüüpi olukorrad:

- **Tavalised kasutusolukorrad:** T1, T2, T3, T11, T12 — süsteemi
  igapäevane ootuspärane kasutus.
- **Veaolukorrad:** T4, T5, T6, T7, T9 — vigane sisend ja keelatud
  tegevused; süsteem peab veast korralikult teavitama, mitte „kokku
  jooksma".
- **Piir- ja erijuhud:** T3 (valikuline väli tühi), T7 (mineviku aeg),
  T8 (tööaja servad ja vale ajavahemik), T10 (ligipääs ilma õiguseta).

---

## 5. Tulemuste hindamine

- Iga testjuhtumi puhul on **oodatav tulemus** kirjas eraldi veerus.
  Test loetakse **õnnestunuks (PASS)**, kui tegelik tulemus vastab
  oodatavale; muidu **ebaõnnestunuks (FAIL)**.
- Veerg **„Tegelik tulemus"** täidetakse testimise käigus (nt
  „PASS" / „FAIL" + lühikirjeldus).
- Veerg **„Märkused"** on vigade, ekraanipiltide viidete või
  täpsustuste jaoks.
- **Üldhinnang:** rakendus loetakse testitud ja vastuvõetavaks, kui kõik
  tavalise kasutuse testid (T1, T2, T3, T11, T12) ja kõik turva-/
  veaolukorra testid (T4, T9, T10) on PASS.

---

## 6. Testikeskkond

- **Brauser:** Firefox / Chrome (viimane versioon)
- **Keskkond:** live-keskkond `https://juuksur.kalaradar.ee`
- **Admini ligipääs:** kasutajanimi `admin` (parool `.env` failis)
- **Andmebaasi seis:** vähemalt 1 juuksur olemas; topeltbroneeringu
  testiks (T4) on vaja eelnevalt üks aeg broneerida.
