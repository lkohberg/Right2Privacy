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
  { name: "Slack", category: "Messaging", status: "watched", feature: "Channels & DMs", note: "No end-to-end encryption; workspace owners and Slack can read everything." },
  { name: "WeChat", category: "Messaging", status: "watched", feature: "Chats & moments", note: "No end-to-end encryption; content is stored and reviewed on Tencent servers." },
  { name: "LINE", category: "Messaging", status: "protected", feature: "Chats & calls", note: "Letter Sealing end-to-end encryption is on by default for chats and calls." },
  { name: "KakaoTalk", category: "Messaging", status: "watched", feature: "Default chats", note: "Regular chats are readable server-side; only Secret Chat mode is end-to-end encrypted." },
  { name: "SimpleX Chat", category: "Messaging", status: "protected", feature: "Chats & calls", note: "End-to-end encrypted with no user identifiers at all, not even random IDs." },
  { name: "Olvid", category: "Messaging", status: "protected", feature: "Chats & calls", note: "End-to-end encrypted, certified by ANSSI; no phone number or address book needed." },
  { name: "Briar", category: "Messaging", status: "protected", feature: "Chats & forums", note: "End-to-end encrypted, works peer-to-peer over Bluetooth or Tor without servers." },
  { name: "Google Chat", category: "Messaging", status: "watched", feature: "Spaces & DMs", note: "Encrypted in transit only; Google and workspace admins can read content." },
  { name: "Telegram (secret chats)", category: "Messaging", status: "protected", feature: "One-to-one secret chats", note: "End-to-end encrypted, device-bound. Must be started manually per contact." },
  { name: "Facebook Messenger (E2EE chats)", category: "Messaging", status: "protected", feature: "Encrypted conversations", note: "Meta is rolling out default encryption; already-upgraded chats are not readable by Meta." },

  // Social
  { name: "TikTok direct messages", category: "Social", status: "watched", feature: "DMs & uploads", note: "Plain server-side storage, moderated and scanned." },
  { name: "X (Twitter) DMs", category: "Social", status: "watched", feature: "Direct messages", note: "Encrypted DMs are limited and opt-in; standard DMs are readable by the platform." },
  { name: "Reddit chat", category: "Social", status: "watched", feature: "Chats & posts", note: "No end-to-end encryption; content is stored and moderated." },
  { name: "Facebook (posts & groups)", category: "Social", status: "watched", feature: "Posts, groups, photos", note: "Everything posted is stored readable and scanned by Meta's moderation systems." },
  { name: "Instagram (posts & stories)", category: "Social", status: "watched", feature: "Posts, stories, reels", note: "Public and private content is stored readable and scanned server-side." },
  { name: "LinkedIn messages", category: "Social", status: "watched", feature: "InMail & messages", note: "No end-to-end encryption; messages are readable by LinkedIn and scanned." },
  { name: "Bluesky DMs", category: "Social", status: "watched", feature: "Direct messages", note: "Messages are stored in plain form on Bluesky servers; posts are public by design." },
  { name: "Mastodon direct messages", category: "Social", status: "watched", feature: "Private mentions", note: "Not end-to-end encrypted; your server admin and the recipient's admin can read them." },
  { name: "Pinterest", category: "Social", status: "watched", feature: "Boards & messages", note: "Uploads and messages are stored readable and moderated server-side." },
  { name: "YouTube (uploads & comments)", category: "Social", status: "watched", feature: "Videos, comments, messages", note: "Everything is stored readable; uploads run through Google's classifiers." },
  { name: "Twitch whispers & VODs", category: "Social", status: "watched", feature: "Whispers, clips, streams", note: "No end-to-end encryption; content is stored and moderated by Twitch." },
  { name: "BeReal", category: "Social", status: "watched", feature: "Photos & comments", note: "Photos are stored readable on servers and visible to the provider." },
  { name: "Steam chat", category: "Social", status: "watched", feature: "Friend & group chats", note: "No end-to-end encryption; chats are stored on Valve servers." },
  { name: "PlayStation / Xbox messages", category: "Social", status: "watched", feature: "Console messages & voice", note: "Messages are stored readable and voice chat can be recorded for moderation." },

  // Email
  { name: "Gmail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Mail is encrypted in transit only; Google can read and scan attachments." },
  { name: "Outlook / Hotmail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Microsoft scans attachments under the voluntary derogation." },
  { name: "Proton Mail", category: "Email", status: "protected", feature: "Mail between Proton users", note: "End-to-end encrypted inside Proton; mail to outside providers is not." },
  { name: "Tuta", category: "Email", status: "protected", feature: "Mailbox & calendar", note: "Mailbox is encrypted at rest with keys the provider cannot use." },
  { name: "Yahoo Mail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Stored readable on Yahoo servers and scanned for features and moderation." },
  { name: "iCloud Mail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Apple holds the keys for iCloud Mail; not covered by Advanced Data Protection." },
  { name: "GMX & WEB.DE", category: "Email", status: "watched", feature: "Mail & attachments", note: "Standard mailboxes are stored readable; optional encryption requires manual setup." },
  { name: "Zoho Mail", category: "Email", status: "watched", feature: "Mail & attachments", note: "Encrypted at rest but Zoho holds the keys and can access content." },
  { name: "Fastmail", category: "Email", status: "watched", feature: "Mail & calendar", note: "Stored on Fastmail servers in readable form; the provider can access it." },
  { name: "StartMail", category: "Email", status: "protected", feature: "Encrypted mailbox", note: "Mailbox is encrypted so the provider cannot read stored mail; PGP supported." },

  // Cloud & files
  { name: "Google Drive / Photos", category: "Cloud & files", status: "watched", feature: "Uploads & shared links", note: "Hash matching and classifiers run on uploaded media." },
  { name: "OneDrive", category: "Cloud & files", status: "watched", feature: "Uploads & sharing", note: "Scanned server-side by Microsoft." },
  { name: "Dropbox", category: "Cloud & files", status: "watched", feature: "Uploads & shared links", note: "Files are scanned against known-abuse hash lists." },
  { name: "iCloud Photos", category: "Cloud & files", status: "watched", feature: "Photo library", note: "Not end-to-end encrypted unless Advanced Data Protection is switched on." },
  { name: "Proton Drive", category: "Cloud & files", status: "protected", feature: "File storage", note: "End-to-end encrypted, provider holds no key." },
  { name: "Cryptomator / VeraCrypt vaults", category: "Cloud & files", status: "protected", feature: "Encrypted containers", note: "Encrypted locally before upload, so the cloud provider only sees ciphertext." },
  { name: "Box", category: "Cloud & files", status: "watched", feature: "Uploads & sharing", note: "Encrypted in transit and at rest, but Box holds the keys and scans content." },
  { name: "Amazon Photos", category: "Cloud & files", status: "watched", feature: "Photo & video backup", note: "Stored readable by Amazon; subject to hash matching and moderation." },
  { name: "iCloud Drive (standard)", category: "Cloud & files", status: "watched", feature: "Files & backups", note: "Apple holds the encryption keys by default; only Advanced Data Protection changes that." },
  { name: "MEGA", category: "Cloud & files", status: "protected", feature: "File storage & sharing", note: "End-to-end encrypted by default; MEGA stores only ciphertext." },
  { name: "Tresorit", category: "Cloud & files", status: "protected", feature: "File storage", note: "Swiss-hosted, end-to-end encrypted by design." },
  { name: "Sync.com", category: "Cloud & files", status: "protected", feature: "File storage & sharing", note: "Zero-knowledge encryption; the provider holds no keys." },
  { name: "Nextcloud (self-hosted)", category: "Cloud & files", status: "protected", feature: "Files, chat, calendar", note: "You control the server and the keys; nothing is visible to a third-party provider." },
  { name: "pCloud (standard)", category: "Cloud & files", status: "watched", feature: "Uploads & sharing", note: "Readable by the provider unless the paid Crypto add-on is used per folder." },

  // Calls & video
  { name: "Zoom", category: "Calls & video", status: "watched", feature: "Meetings & chat", note: "End-to-end encryption exists but is off by default and disables many features." },
  { name: "Microsoft Teams", category: "Calls & video", status: "watched", feature: "Chats, calls, files", note: "Encrypted in transit only; tenant admins and the provider can access content." },
  { name: "Google Meet", category: "Calls & video", status: "watched", feature: "Meetings & chat", note: "Encrypted in transit; client-side encryption only in paid enterprise plans." },
  { name: "FaceTime", category: "Calls & video", status: "protected", feature: "Audio & video calls", note: "End-to-end encrypted between Apple devices." },
  { name: "Jitsi Meet (E2EE on)", category: "Calls & video", status: "protected", feature: "Video rooms", note: "End-to-end encryption available for small rooms; self-hostable." },
  { name: "Webex", category: "Calls & video", status: "watched", feature: "Meetings & messaging", note: "End-to-end encryption is optional; by default Cisco can access content." },
  { name: "Slack Huddles", category: "Calls & video", status: "watched", feature: "Audio & video huddles", note: "Encrypted in transit only; not end-to-end encrypted." },
  { name: "Telegram voice calls", category: "Calls & video", status: "protected", feature: "One-to-one calls", note: "Voice calls between two people are end-to-end encrypted; group calls are not." },
  { name: "SMS & mobile phone calls", category: "Calls & video", status: "watched", feature: "Texts & calls", note: "No end-to-end encryption at all; carriers store and can be ordered to retain content." },
  { name: "RCS messages (Google)", category: "Calls & video", status: "protected", feature: "One-to-one RCS chats", note: "End-to-end encrypted between Google Messages users; group chats vary by client." },
];

export const WATCH_CATEGORIES = [
  "Messaging",
  "Social",
  "Email",
  "Cloud & files",
  "Calls & video",
] as const;
