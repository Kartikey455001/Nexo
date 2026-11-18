# Security Documentation

NEXO is designed with a "security-first, privacy-first" mindset.

## Key Principles
1. **End-to-End Encryption (E2EE)**: Messages and media are encrypted client-side and decrypted client-side. The server only handles ciphertext.
2. **Minimal Data Storage**: Ephemeral data like stories expire automatically. Read receipts and typing indicators are routed without long-term storage where possible.
3. **Defense in Depth**: We utilize rate-limiting, risk scoring (fraud engine), token rotation, and robust authentication.

## Authentication
- Email and password registration and sign-in, with throttling and normalized email addresses.
- Passwords are stored as bcrypt hashes; passwords are never returned by the API.
- Short-lived access tokens are bound to a server-side session. Long-lived refresh tokens are random, stored as SHA-256 hashes, rotated on use, and revocable per session.
- E2EE private identity keys are generated on the client and can be backed up only as password-encrypted ciphertext.

## Key Management
- Public keys are stored in MongoDB; private keys are created client-side and are only uploaded as an encrypted backup. A client must unlock the backup locally with the account password.
- The current web key exchange uses static P-256 ECDH and AES-GCM. It does not provide the forward secrecy or key transparency of a reviewed Signal-style protocol and needs an independent security review before production claims.
