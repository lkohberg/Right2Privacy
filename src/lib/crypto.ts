// Browser-only Web Crypto helpers for Right2Privacy.
// RSA-OAEP 2048 identity keypair + AES-GCM 256 per-message keys.

const RSA_ALGO = { name: "RSA-OAEP", hash: "SHA-256" } as const;
const RSA_MOD_LEN = 2048;
const AES_ALGO = { name: "AES-GCM", length: 256 } as const;
const PBKDF2_ITER = 250_000;

// ---------- base64 helpers ----------

export function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const ab = new ArrayBuffer(s.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i);
  return ab;
}

function rand(n: number): ArrayBuffer {
  const ab = new ArrayBuffer(n);
  crypto.getRandomValues(new Uint8Array(ab));
  return ab;
}

// ---------- RSA keypair ----------

export async function generateRsaKeypair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MOD_LEN,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  );
}

export async function exportPublicKey(pub: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", pub);
  return bufToB64(spki);
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", b64ToBuf(b64), RSA_ALGO, true, [
    "encrypt",
    "wrapKey",
  ]);
}

export async function exportPrivateKeyRaw(priv: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("pkcs8", priv);
}

export async function importPrivateKeyRaw(buf: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", buf, RSA_ALGO, true, [
    "decrypt",
    "unwrapKey",
  ]);
}

// ---------- password-derived key (for encrypted backup) ----------

async function deriveWrapKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password).buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPrivateKeyForBackup(
  privateKey: CryptoKey,
  password: string,
): Promise<{ encrypted_private_key: string; pk_salt: string; pk_iv: string }> {
  const pkcs8 = await exportPrivateKeyRaw(privateKey);
  const salt = rand(16);
  const iv = rand(12);
  const wrapKey = await deriveWrapKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, pkcs8);
  return {
    encrypted_private_key: bufToB64(ct),
    pk_salt: bufToB64(salt),
    pk_iv: bufToB64(iv),
  };
}

export async function decryptPrivateKeyFromBackup(
  encrypted: string,
  salt: string,
  iv: string,
  password: string,
): Promise<CryptoKey> {
  const wrapKey = await deriveWrapKey(password, b64ToBuf(salt));
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(iv) },
    wrapKey,
    b64ToBuf(encrypted),
  );
  return importPrivateKeyRaw(pkcs8);
}

// ---------- message encryption ----------

export interface CipherBlob {
  v: 1;
  mid: string; // message id
  iv: string;
  ct: string;
}

export async function encryptMessage(plaintext: string, recipientPublicKeyB64: string): Promise<{
  blob: string;
  wrappedKey: string;
  messageId: string;
  rawKey: string;
}> {
  const aesKey = await crypto.subtle.generateKey(AES_ALGO, true, ["encrypt", "decrypt"]);
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext).buffer as ArrayBuffer,
  );
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);
  const recipientPub = await importPublicKey(recipientPublicKeyB64);
  const wrapped = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPub,
    rawAes,
  );
  const messageId = bufToB64(rand(18));
  const blob: CipherBlob = {
    v: 1,
    mid: messageId,
    iv: bufToB64(iv),
    ct: bufToB64(ct),
  };
  const encoded = btoa(JSON.stringify(blob));
  return {
    blob: `R2P:${encoded}`,
    wrappedKey: bufToB64(wrapped),
    messageId,
  };
}

export function parseBlob(blob: string): CipherBlob {
  const trimmed = blob.trim();
  const payload = trimmed.startsWith("R2P:") ? trimmed.slice(4) : trimmed;
  const json = JSON.parse(atob(payload));
  if (json?.v !== 1 || !json.mid || !json.iv || !json.ct) {
    throw new Error("Invalid ciphertext blob");
  }
  return json as CipherBlob;
}

export async function decryptMessage(
  blob: CipherBlob,
  wrappedKeyB64: string,
  privateKey: CryptoKey,
): Promise<string> {
  const rawAes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64ToBuf(wrappedKeyB64),
  );
  const aesKey = await crypto.subtle.importKey("raw", rawAes, AES_ALGO, false, [
    "decrypt",
  ]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(blob.iv) },
    aesKey,
    b64ToBuf(blob.ct),
  );
  return new TextDecoder().decode(pt);
}
// ---------- archive helpers (re-wrap a message key for yourself) ----------

/** Unwrap an RSA-wrapped AES key and return it as raw base64. */
export async function unwrapRawKey(
  wrappedKeyB64: string,
  privateKey: CryptoKey,
): Promise<string> {
  const rawAes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64ToBuf(wrappedKeyB64),
  );
  return bufToB64(rawAes);
}

/** Wrap a raw AES key (base64) with an RSA public key (base64 SPKI). */
export async function wrapRawKeyFor(
  rawKeyB64: string,
  publicKeyB64: string,
): Promise<string> {
  const pub = await importPublicKey(publicKeyB64);
  const wrapped = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    pub,
    b64ToBuf(rawKeyB64),
  );
  return bufToB64(wrapped);
}

/** Decrypt a blob with an already-unwrapped raw AES key (base64). */
export async function decryptWithRawKey(
  blob: CipherBlob,
  rawKeyB64: string,
): Promise<string> {
  const aesKey = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(rawKeyB64),
    AES_ALGO,
    false,
    ["decrypt"],
  );
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(blob.iv) },
    aesKey,
    b64ToBuf(blob.ct),
  );
  return new TextDecoder().decode(pt);
}
