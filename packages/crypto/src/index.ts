// NEXO Cryptographic Primitives
// Supports Web Crypto API (browser) and Node.js (crypto.webcrypto / globalThis.crypto)

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Web Crypto API is not available in the current environment');
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates an ECDH Curve P-256 identity keypair.
 */
export async function generateIdentityKeyPair() {
  const crypto = getCrypto();
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const identityKeyPublic = arrayBufferToBase64(exportedPublicKey);

  return {
    identityKeyPublic,
    keyPair,
  };
}

/**
 * Generates an ephemeral Pre-Key for double ratchet / asynchronous sessions.
 */
export async function generatePreKey(id?: number) {
  const crypto = getCrypto();
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKey = arrayBufferToBase64(exportedPublicKey);
  const keyId = id ?? Math.floor(Math.random() * 1000000);

  return {
    keyId,
    publicKey,
    keyPair,
  };
}

/**
 * Derives a 256-bit AES-GCM symmetric key from our private key and the peer's public key.
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKeyBase64: string
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const peerKeyBuffer = base64ToArrayBuffer(peerPublicKeyBase64);

  const peerPublicKey = await crypto.subtle.importKey(
    'spki',
    peerKeyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string with AES-GCM 256 using a random 12-byte IV.
 */
export async function encryptMessage(
  plainText: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  return {
    cipherText: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts an AES-GCM ciphertext using the given key and IV.
 */
export async function decryptMessage(
  cipherTextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const crypto = getCrypto();
  const cipherBuffer = base64ToArrayBuffer(cipherTextBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Computes a SHA-256 hash of a normalized phone number for privacy-preserving contact matching.
 */
export async function hashPhoneNumber(phone: string, salt: string = 'nexo-salt'): Promise<string> {
  const crypto = getCrypto();
  const normalized = phone.trim().replace(/\s+/g, '');
  const data = new TextEncoder().encode(`${salt}:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
