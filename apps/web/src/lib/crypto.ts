export type EncryptedKeyBackup = {
  encryptedIdentityKeyBackup: string;
  identityKeyBackupSalt: string;
  identityKeyBackupIv: string;
};

export type LocalIdentity = {
  identityKeyPublic: string;
  privateKey: CryptoKey;
};

type StoredIdentity = LocalIdentity & {
  email: string;
  backup: EncryptedKeyBackup;
};

const KEY_DATABASE = "nexo-keyring";
const KEY_STORE = "identities";
const BACKUP_ITERATIONS = 600_000;

function getCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto?.subtle) return window.crypto;
  throw new Error("Web Crypto is not available. Open NEXO in a secure browser context.");
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export async function generateIdentityKeyPair() {
  const keyPair = await getCrypto().subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const publicKey = await getCrypto().subtle.exportKey("spki", keyPair.publicKey);
  return { identityKeyPublic: arrayBufferToBase64(publicKey), keyPair };
}

export async function createIdentityForPassword(email: string, password: string) {
  const crypto = getCrypto();
  const generated = await generateIdentityKeyPair();
  const privateKeyBytes = await crypto.subtle.exportKey("pkcs8", generated.keyPair.privateKey);
  const backup = await encryptPrivateKeyBackup(password, privateKeyBytes);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const identity = { identityKeyPublic: generated.identityKeyPublic, privateKey };
  await storeIdentity(email, identity, backup);
  return { identity, backup };
}

export async function restoreIdentityForPassword(
  email: string,
  password: string,
  identityKeyPublic: string,
  backup: EncryptedKeyBackup,
) {
  const privateKeyBytes = await decryptPrivateKeyBackup(password, backup);
  const privateKey = await getCrypto().subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const identity = { identityKeyPublic, privateKey };
  await storeIdentity(email, identity, backup);
  return identity;
}

export async function getStoredIdentity(email: string): Promise<StoredIdentity | null> {
  const normEmail = email.toLowerCase().trim();

  // 1. Try localStorage first (instant & reliable across refreshes)
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`nexo_id_${normEmail}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.identityKeyPublic && parsed.privateKeyPkcs8) {
          const privateKey = await getCrypto().subtle.importKey(
            "pkcs8",
            base64ToArrayBuffer(parsed.privateKeyPkcs8),
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"],
          );
          return {
            email: normEmail,
            identityKeyPublic: parsed.identityKeyPublic,
            privateKey,
            backup: parsed.backup || {
              encryptedIdentityKeyBackup: "",
              identityKeyBackupSalt: "",
              identityKeyBackupIv: "",
            },
          };
        }
      }
    } catch (e) {
      console.warn("Could not read key from localStorage:", e);
    }
  }

  // 2. Fall back to IndexedDB
  try {
    const database = await openKeyDatabase();
    try {
      const result = await new Promise<StoredIdentity | null>((resolve, reject) => {
        const request = database.transaction(KEY_STORE, "readonly").objectStore(KEY_STORE).get(normEmail);
        request.onsuccess = () => resolve((request.result as StoredIdentity | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error("Unable to read local keys"));
      });
      if (result) {
        try {
          if (result.privateKey?.extractable) {
            const pkcs8 = await getCrypto().subtle.exportKey("pkcs8", result.privateKey);
            localStorage.setItem(
              `nexo_id_${normEmail}`,
              JSON.stringify({
                identityKeyPublic: result.identityKeyPublic,
                privateKeyPkcs8: arrayBufferToBase64(pkcs8),
                backup: result.backup,
              }),
            );
          }
        } catch {}
        return result;
      }
    } finally {
      database.close();
    }
  } catch (idbErr) {
    console.warn("IndexedDB getStoredIdentity failed:", idbErr);
  }

  return null;
}

export async function storeIdentity(
  email: string,
  identity: LocalIdentity,
  backup: EncryptedKeyBackup,
) {
  const normEmail = email.toLowerCase().trim();

  // 1. Save to localStorage
  if (typeof window !== "undefined") {
    try {
      let privateKeyPkcs8 = "";
      if (identity.privateKey.extractable) {
        const pkcs8 = await getCrypto().subtle.exportKey("pkcs8", identity.privateKey);
        privateKeyPkcs8 = arrayBufferToBase64(pkcs8);
      }
      localStorage.setItem(
        `nexo_id_${normEmail}`,
        JSON.stringify({
          identityKeyPublic: identity.identityKeyPublic,
          privateKeyPkcs8,
          backup,
        }),
      );
    } catch (err) {
      console.warn("Failed to save identity to localStorage:", err);
    }
  }

  // 2. Save to IndexedDB
  try {
    const database = await openKeyDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(KEY_STORE, "readwrite");
        transaction.objectStore(KEY_STORE).put({ email: normEmail, ...identity, backup });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save local keys"));
        transaction.onabort = () => reject(transaction.error ?? new Error("Local key storage was interrupted"));
      });
    } finally {
      database.close();
    }
  } catch (idbErr) {
    console.warn("IndexedDB storeIdentity failed:", idbErr);
  }
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKeyBase64: string,
): Promise<CryptoKey> {
  const peerPublicKey = await getCrypto().subtle.importKey(
    "spki",
    base64ToArrayBuffer(peerPublicKeyBase64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  return getCrypto().subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMessage(plainText: string, key: CryptoKey) {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plainText),
  );
  return { cipherText: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv.buffer) };
}

export async function decryptMessage(cipherText: string, iv: string, key: CryptoKey) {
  const cleartext = await getCrypto().subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(iv)) },
    key,
    base64ToArrayBuffer(cipherText),
  );
  return new TextDecoder().decode(cleartext);
}

export async function encryptMedia(file: File) {
  const crypto = getCrypto();
  const mediaKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const fileIv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: fileIv },
    mediaKey,
    await file.arrayBuffer(),
  );
  const rawKey = await crypto.subtle.exportKey("raw", mediaKey);
  return {
    ciphertext,
    fileIv: arrayBufferToBase64(fileIv.buffer),
    fileKey: arrayBufferToBase64(rawKey),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function decryptMedia(
  ciphertext: ArrayBuffer,
  encodedKey: string,
  encodedIv: string,
  mimeType: string,
) {
  const key = await getCrypto().subtle.importKey(
    "raw",
    base64ToArrayBuffer(encodedKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const cleartext = await getCrypto().subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(encodedIv)) },
    key,
    ciphertext,
  );
  return URL.createObjectURL(new Blob([cleartext], { type: mimeType }));
}

async function encryptPrivateKeyBackup(password: string, privateKey: ArrayBuffer): Promise<EncryptedKeyBackup> {
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await derivePasswordWrappingKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, privateKey);
  return {
    encryptedIdentityKeyBackup: arrayBufferToBase64(ciphertext),
    identityKeyBackupSalt: arrayBufferToBase64(salt.buffer),
    identityKeyBackupIv: arrayBufferToBase64(iv.buffer),
  };
}

async function decryptPrivateKeyBackup(password: string, backup: EncryptedKeyBackup) {
  const salt = base64ToArrayBuffer(backup.identityKeyBackupSalt);
  const iv = new Uint8Array(base64ToArrayBuffer(backup.identityKeyBackupIv));
  const wrappingKey = await derivePasswordWrappingKey(password, new Uint8Array(salt));
  try {
    return await getCrypto().subtle.decrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      base64ToArrayBuffer(backup.encryptedIdentityKeyBackup),
    );
  } catch {
    throw new Error("This password could not unlock the encrypted identity key backup.");
  }
}

async function derivePasswordWrappingKey(password: string, salt: BufferSource) {
  const crypto = getCrypto();
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: BACKUP_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function openKeyDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Secure browser key storage is unavailable."));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(KEY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(KEY_STORE)) {
        request.result.createObjectStore(KEY_STORE, { keyPath: "email" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local key storage"));
  });
}
