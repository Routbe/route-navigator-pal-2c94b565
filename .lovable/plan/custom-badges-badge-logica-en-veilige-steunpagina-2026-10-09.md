# Custom badges, badge-logica en veilige steunpagina

Vijf onderdelen, in deze volgorde gebouwd. Elk deel werkt los van de andere.

## 1. Eigen badges (familiewapens, bedrijfslogo's)
- Nieuwe adminpagina **/admin/custom-badges**: raster met alle eigen badges (naam, afbeelding, aantal houders) + knop "Nieuwe badge" (naam, korte omschrijving, afbeelding uploaden, alleen admin).
- Klik op een badge: lijst van alle houders, met een zoekveld op handle/gebruikersnaam om direct toe te kennen of in te trekken.
- In het bestaande gebruikersbeheer van de admin: blok "Eigen badges" om er één of meer toe te kennen.
- Op het publieke profiel verschijnen eigen badges **naast** het blauwe vinkje of het privacyschild, nooit in de plaats ervan.

## 2. Badge-logica
- **Blauw vinkje** toont wettelijke naam en land; **Privacyschild** bevestigt enkel een echt mens en toont nooit de wettelijke naam. Dit wordt server-side afgedwongen in de publieke profielgegevens, niet alleen in de weergave.
- **Influencerbadge (roze)** en **Bedrijfsbadge** verschijnen alleen als keuze wanneer de aanvraag door een admin is goedgekeurd. De server weigert ook een niet-verdiende badge te bewaren.

## 3. Badge voor je eigen site (vernieuwd)
- Nieuwe generator met voorbeeld in licht/donker, keuze klein/standaard.
- Code-snippet: één `<a>` met een `<picture>`-badge (SVG), die automatisch licht of donker kleurt via `prefers-color-scheme` van de bezoeker, met vaste breedte/hoogte (geen verspringing), lange cache-headers en geen JavaScript of trackers.

## 4. Steunpagina (rout.be/[handle]/tip) – alleen geverifieerd
- In de Studio is het paneel "Steunpagina & donaties" **vergrendeld** voor gratis aliassen (rout.be/u/alias), met uitleg dat geldfuncties identiteitsverificatie vereisen.
- Instellingen: IBAN + rekeninghoudernaam (moet overeenkomen met de goedgekeurde wettelijke naam), vaste bedragen (bv. €5/€10/€25), "vrij bedrag" aan/uit, minimumbedrag.
- **Standaard en altijd zichtbaar:** EPC/SEPA QR-code die meeverandert met het gekozen bedrag, plus een net tekstvak met IBAN, naam en mededeling met kopieerknoppen. Geen API, geen kosten, ROUT raakt geen geld aan.
- Tot 3 afbeeldingen: na het kiezen opent meteen een bijsnij-/draaivenster; de afbeelding wordt in de browser bijgesneden (vaste verhouding) en verkleind vóór het uploaden naar de bestaande opslag.
- De huidige betaling via het platform-Stripe-account op de steunpagina vervalt; ROUT verwerkt geen geldstromen meer voor fooien.

## 5. Eigen betaalprovider (BYOK) – optioneel
- Extra paneel **"Betaalproviders (PSP)"** in de Studio voor geverifieerde pro-leden; uitgelicht voor wie een Bedrijfsbadge heeft.
- Ondersteund: Stripe en Mollie (eigen geheime sleutel). Sleutel wordt bij opslaan bij de provider gecontroleerd en daarna **versleuteld** bewaard; na opslaan nooit meer getoond (alleen "•••• laatste 4", vervangen of verwijderen).
- Verplichte disclaimer: "ROUT is geen betaalverwerker en neemt geen commissie. Je gebruikt je eigen PSP-contract; ROUT levert enkel de visuele knop." + korte gids per provider, met de waarschuwing dat Wero/Bancontact een geregistreerd bedrijf vereist.
- Publieke pagina: QR bovenaan (bank-naar-bank, zonder kosten), daaronder de knoppen Kaart / Bancontact / Wero die rechtstreeks een betaling aanmaken op het account van de maker.

## Technische details
- `db/55_custom_badges.sql`: `custom_badges` (id, slug, name, description, image_key, created_by) en `user_custom_badges` (user_id, badge_id, granted_by, granted_at, unique). Beheer via admin-only server functions met de bestaande admin-check; afbeeldingen in de interne bucket.
- `db/56_tip_pages.sql`: `tip_settings` (user_id, iban, account_name, presets int[], allow_custom, min_cents, image_keys text[] max 3) en `psp_credentials` (user_id, provider, ciphertext, iv, last4, verified_at).
- Versleuteling: AES-256-GCM via WebCrypto (werkt op de server-runtime) met nieuwe sleutel `PSP_ENCRYPTION_KEY`, aangemaakt als gegenereerd geheim en toegevoegd aan `ENVIRONMENT.md`/`.env.example`. Decryptie alleen in de checkout-serverfunctie.
- Toegang tot tip/PSP wordt in elke serverfunctie gecontroleerd (geverifieerd + root-handle), nooit alleen in de UI.
- EPC QR hergebruikt `src/lib/epc-qr.ts`; IBAN-controle via bestaande `payment-validation.ts`.
- Bijsnijder: `react-easy-crop` + canvas → WebP (max 1600px).
- Badge-snippet: `api_.public.badge.$handle.ts` krijgt `?theme=light|dark` en `Cache-Control: public, max-age=86400, stale-while-revalidate`.
- Nieuwe architectuurregels komen in `AGENTS.md`.
