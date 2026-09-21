// Which communication and storage services can be read/scanned under current EU rules
// (voluntary scanning derogation + planned CSAR detection orders), and which cannot.
// "watched" = provider can read content, so scanning is technically possible today.
// "protected" = content is end-to-end encrypted by default, provider holds no key.

export type WatchStatus = "watched" | "protected";

export type WatchedService = {
  name: string;
  category: "Messaging" | "Social" | "Email" | "Cloud & files" | "Calls & video";
  status: WatchStatus;
  feature: string;
  note: string;
};

export const WATCHED_SERVICES: WatchedService[] = [
  // Messaging
  { name: "WhatsApp", category: "Messaging", status: "protected", feature: "Chats & calls", note: "End-to-end encrypted by default. Metadata and unencrypted cloud backups are still visible to Meta." },
  { name: "Signal", category: "Messaging", status: "protected", feature: "Chats, calls, groups", note: "End-to-end encrypted, minimal metadata. Signal has said it would leave the EU rather than scan." },
  { name: "Threema", category: "Messaging", status: "protected", feature: "Chats & calls", note: "End-to-end encrypted, no phone number required." },
  { name: "Session", category: "Messaging", status: "protected", feature: "Chats", note: "End-to-end encrypted and routed over an onion network, no account identifier." },
  { name: "Element / Matrix", category: "Messaging", status: "protected", feature: "Encrypted rooms", note: "End-to-end encrypted by default in private rooms; public rooms are readable." },
  { name: "Wire", category: "Messaging", status: "protected", feature: "Chats & calls", note: "End-to-end encrypted by default." },
  { name: "iMessage", category: "Messaging", status: "protected", feature: "Blue-bubble chats", note: "Encrypted between Apple devices. SMS fallback and standard iCloud backups are not protected." },
  { name: "Telegram (cloud chats)", category: "Messaging", status: "watched", feature: "Default chats & groups", note: "Normal chats are stored on Telegram servers and readable there. Only Secret Chats are end-to-end encrypted." },
  { name: "Facebook Messenger", category: "Messaging", status: "watched", feature: "Older chats, groups, marketplace", note: "Meta scanned messages under the voluntary derogation; encryption rollout is not complete everywhere." },
  { name: "Instagram direct messages", category: "Messaging", status: "watched", feature: "DMs, media, requests", note: "Scanned for known abuse material; encryption is opt-in, not the default in every context." },
  { name: "Snapchat", category: "Messaging", status: "watched", feature: "Snaps, chats, Stories", note: "Reports the second-highest volume of scanning reports in the EU derogation statistics." },
  { name: "Discord", category: "Messaging", status: "watched", feature: "DMs, servers, uploads", note: "No end-to-end encryption for text; content is scanned server-side." },
  { name: "Skype", category: "Messaging", status: "watched", feature: "Chats & files", note: "Microsoft scans content under the voluntary derogation." },
  { name: "Viber", category: "Messaging", status: "protected", feature: "One-to-one chats & calls", note: "End-to-end encrypted by default; communities and bots are not." },

  // Social
  { name: "TikTok direct messages", category: "Social", status: "watched", feature: "DMs & uploads", note: "Plain server-side storage, moderated and scanned." },
  { name: "X (Twitter) DMs", category: "Social", status: "watched", feature: "Direct messages", note: "Encrypted DMs are limited and opt-in; standard DMs are readable by the platform." },
  { name: "Reddit chat", category: "Social", status: "watched", feature: "Chats & posts", note: "No end-to-end encryption; content is stored and moderated." },

  // Email
  { name: "Gmail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Mail is encrypted in transit only; Google can read and scan attachments." },
  { name: "Outlook / Hotmail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Microsoft scans attachments under the voluntary derogation." },
  { name: "Proton Mail", category: "Email", status: "protected", feature: "Mail between Proton users", note: "End-to-end encrypted inside Proton; mail to outside providers is not." },
  { name: "Tuta", category: "Email", status: "protected", feature: "Mailbox & calendar", note: "Mailbox is encrypted at rest with keys the provider cannot use." },

  // Cloud & files
  { name: "Google Drive / Photos", category: "Cloud & files", status: "watched", feature: "Uploads & shared links", note: "Hash matching and classifiers run on uploaded media." },
  { name: "OneDrive", category: "Cloud & files", status: "watched", feature: "Uploads & sharing", note: "Scanned server-side by Microsoft." },
  { name: "Dropbox", category: "Cloud & files", status: "watched", feature: "Uploads & shared links", note: "Files are scanned against known-abuse hash lists." },
  { name: "iCloud Photos", category: "Cloud & files", status: "watched", feature: "Photo library", note: "Not end-to-end encrypted unless Advanced Data Protection is switched on." },
  { name: "Proton Drive", category: "Cloud & files", status: "protected", feature: "File storage", note: "End-to-end encrypted, provider holds no key." },
  { name: "Cryptomator / VeraCrypt vaults", category: "Cloud & files", status: "protected", feature: "Encrypted containers", note: "Encrypted locally before upload, so the cloud provider only sees ciphertext." },

  // Calls & video
  { name: "Zoom", category: "Calls & video", status: "watched", feature: "Meetings & chat", note: "End-to-end encryption exists but is off by default and disables many features." },
  { name: "Microsoft Teams", category: "Calls & video", status: "watched", feature: "Chats, calls, files", note: "Encrypted in transit only; tenant admins and the provider can access content." },
  { name: "Google Meet", category: "Calls & video", status: "watched", feature: "Meetings & chat", note: "Encrypted in transit; client-side encryption only in paid enterprise plans." },
  { name: "FaceTime", category: "Calls & video", status: "protected", feature: "Audio & video calls", note: "End-to-end encrypted between Apple devices." },
  { name: "Jitsi Meet (E2EE on)", category: "Calls & video", status: "protected", feature: "Video rooms", note: "End-to-end encryption available for small rooms; self-hostable." },
];

export const WATCH_CATEGORIES = [
  "Messaging",
  "Social",
  "Email",
  "Cloud & files",
  "Calls & video",
] as const;
