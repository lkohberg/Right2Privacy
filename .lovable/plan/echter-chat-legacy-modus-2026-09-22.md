# Echter Chat + Legacy-Modus

## Ziel

Right2Privacy bekommt einen echten Chat: Nachricht schreiben, absenden, beim
Empfänger erscheint sie im Gespräch und wird automatisch entschlüsselt.
Der bisherige Ablauf (Chiffretext kopieren und einfügen) bleibt vollständig
erhalten und heißt künftig **Legacy-Modus**.

## Modus-Umschalter

- Umschalter in der Seitenleiste (PC) und in den Einstellungen (alle Geräte).
- Die Wahl wird am Konto gespeichert und gilt nach Abmelden/Neuladen weiter.
- Standard: Chat. Legacy jederzeit wählbar.
- Beschriftung in allen 24 Sprachen: "Chat" und "Legacy-Modus".

## Chat-Modus

- Kontaktliste wie bisher; rechts das Gespräch als Nachrichtenverlauf
  (eigene Nachrichten rechts, empfangene links, mit Uhrzeit).
- Unten ein Eingabefeld mit Senden-Knopf.
- Beim Senden wird wie bisher im Browser verschlüsselt; nur der Chiffretext
  und der für den Empfänger verpackte Schlüssel verlassen das Gerät.
- Beim Empfänger wird die Nachricht automatisch entschlüsselt und angezeigt.
- Neue Nachrichten erscheinen ohne Neuladen (Polling im bestehenden
  Benachrichtigungstakt) und lösen die bekannten Hinweise aus.
- Eigene gesendete Nachrichten bleiben lesbar (bestehendes Schlüssel-Archiv).

## Legacy-Modus

Unverändert: Nachricht schreiben, Chiffretext kopieren, Gegenseite fügt ihn
ein und entschlüsselt. Umschalten löscht keine Daten; alte Nachrichten
bleiben in beiden Modi zugänglich.

## Wichtig zur Privatsphäre

Für einen echten Chat muss der verschlüsselte Text kurz auf dem Server
liegen, bis ihn der Empfänger abholt. Lesbar ist er dort nicht – der
Schlüssel bleibt wie bisher nur in den beiden Browsern. Wer das nicht will,
bleibt beim Legacy-Modus, bei dem gar kein Nachrichtentext gespeichert wird.

## Technische Umsetzung

- Migration: Tabelle `public.messages` (`id`, `sender_id`, `recipient_id`,
  `message_id`, `ciphertext`, `created_at`, `read_at`) mit GRANTs und RLS –
  Einfügen nur durch den Absender mit bestehender Freundschaft, Lesen nur
  für Absender und Empfänger, Löschen für beide.
- Migration: Spalte `profiles.chat_mode text not null default 'chat'`
  (`'chat' | 'legacy'`).
- `src/lib/messages.functions.ts`: `sendMessage`, `listConversation`,
  `markRead` über `requireSupabaseAuth`.
- `src/lib/friends.functions.ts`: `updateChatMode`; `getMyProfile` liefert
  `chat_mode` mit.
- `src/routes/_authenticated/app.tsx`: Chat-Ansicht als neue Komponente;
  bestehende `EncryptPanel`/`DecryptPanel` bleiben als Legacy-Ansicht.
- Umschalter in `route.tsx` (Seitenleiste) und `settings.tsx`.
- Neue Übersetzungsschlüssel in allen 24 Sprachen in
  `src/i18n/translations.ts`.
- Verschlüsselung, Schlüsselzustellung, Archiv und Benachrichtigungen bleiben
  unverändert.
