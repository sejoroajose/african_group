import base64url from 'base64url'

const CredentialHelper = {
  formatCredential(credential) {
    return {
      credId: this.normalizeCredentialId(credential.credential_id),
      publicKey: this.encodePublicKey(credential.public_key),
      prevCounter: credential.sign_count || 0,
      createdAt: credential.created_at,
      lastUsed: credential.last_used,
    }
  },

  normalizeCredentialId(credentialId) {
    try {
      if (typeof credentialId === 'object') {
        if (
          credentialId.type === 'Buffer' &&
          Array.isArray(credentialId.data)
        ) {
          return base64url.encode(Buffer.from(credentialId.data))
        }

        if (Buffer.isBuffer(credentialId)) {
          return base64url.encode(credentialId)
        }
      }

      if (typeof credentialId === 'string') {
        return base64url.encode(base64url.decode(credentialId))
      }

      throw new Error('Unable to normalize credential ID')
    } catch (error) {
      console.error('Credential ID normalization error:', error)
      return null
    }
  },

  encodePublicKey(publicKey) {
    try {
      if (typeof publicKey === 'string') {
        return base64url.encode(base64url.decode(publicKey))
      }

      if (
        Buffer.isBuffer(publicKey) ||
        (publicKey.type === 'Buffer' && Array.isArray(publicKey.data))
      ) {
        return base64url.encode(Buffer.from(publicKey.data || publicKey))
      }

      return null
    } catch (error) {
      console.error('Public key encoding error:', error)
      return null
    }
  },

  isValidCredential(credential) {
    return !!(
      credential.credential_id &&
      credential.public_key &&
      (credential.sign_count || credential.sign_count === 0)
    )
  },
}

export default CredentialHelper
