# Nachrichten-Archiv: Chiffretexte dauerhaft wieder öffnen

Heute wird der Schlüssel zu einer Nachricht nach dem ersten Entschlüsseln gelöscht. Wer denselben Chiffretext später noch einmal einfügt, bekommt ihn nicht mehr auf. Das ändert sich: Der Schlüssel wird beim ersten Öffnen für dich selbst neu verpackt und aufbewahrt.

## Was sich für dich ändert

- Einen bereits geöffneten `R2P:…`-Block erneut einfügen: er öffnet sich sofort, ohne dass der Absender etwas neu schicken muss.
- Das gilt auch auf einem anderen Gerät, solange du dort mit deinem Passwort deine Schlüssel entsperrt hast.
- Auch eigene gesendete Nachrichten kannst du später wieder öffnen, weil beim Senden zusätzlich eine für dich selbst verpackte Kopie des Schlüssels abgelegt wird.
- Kein Nachrichtentext wird gespeichert, nur der verpackte Schlüssel. Der Chiffretext muss weiterhin eingefügt werden.
- Der Server kann damit nichts anfangen: die aufbewahrten Schlüssel sind mit deinem öffentlichen Schlüssel verpackt und nur in deinem Browser zu öffnen.

Eine Einschränkung bleibt bestehen: Wenn du deine Schlüssel neu erzeugst (etwa nach einem Passwort-Reset ohne Backup), ist auch das Archiv nicht mehr lesbar. Das ist bewusst so.

## Umsetzung

### Datenbank

Neue Tabelle `public.message_keys`:

- `id`, `owner_id` (auth.users), `message_id` (text), `counterpart_id` (auth.users, der andere Teilnehmer), `direction` (`sent` | `received`), `wrapped_key` (text, RSA-OAEP an `owner_id`s Public Key), `created_at`
- Unique-Index auf `(owner_id, message_id)`
- GRANT `SELECT, INSERT, DELETE` an `authenticated`, `ALL` an `service_role`
- RLS an; Policies: select/insert/delete nur `auth.uid() = owner_id`, kein UPDATE
- Index auf `(owner_id, message_id)`

`pending_keys` bleibt unverändert als Übergabekanal.

### Server-Funktionen (`src/lib/keys.functions.ts`)

- `archiveMessageKey` — schreibt eine Zeile in `message_keys` für den Aufrufer (`owner_id = userId`), `onConflict` ignorieren.
- `fetchArchivedKey` — liest `wrapped_key` zu `(userId, message_id)`; löscht nichts.
- `fetchWrappedKey` bleibt wie bisher (inkl. Löschen der `pending_keys`-Zeile).

### Client (`src/routes/_authenticated/app.tsx`, `src/lib/crypto.ts`)

Die `messageId` steckt bereits im `R2P:`-Block (`parsed.mid`), es braucht also keine neue ID.

- Verschlüsseln: nach `postWrappedKey` zusätzlich den AES-Schlüssel mit dem **eigenen** Public Key verpacken und via `archiveMessageKey` mit `direction: "sent"` ablegen.
- Entschlüsseln: zuerst `fetchArchivedKey` versuchen. Treffer → direkt entpacken und Text anzeigen. Kein Treffer → wie bisher `fetchWrappedKey`, nach erfolgreichem Entschlüsseln den AES-Schlüssel mit dem eigenen Public Key neu verpacken und via `archiveMessageKey` (`direction: "received"`) ablegen.
- Dafür eine kleine Hilfsfunktion in `crypto.ts`, die einen bereits entpackten AES-Schlüssel erneut RSA-verpackt (der Schlüssel muss dazu als `extractable` importiert werden).

### Texte

Neue i18n-Schlüssel für Statusmeldungen („Aus deinem Archiv geöffnet") in allen 24 Sprachen ergänzen, englischer Fallback bleibt.
