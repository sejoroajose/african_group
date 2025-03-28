import * as fido2 from '@simplewebauthn/server'
import { isoUint8Array } from '@simplewebauthn/server/helpers'
import base64url from 'base64url'

const WebAuthnService = {
  CONFIG: {
    RP_NAME: 'African Group NG Employee Attendance System',
    TIMEOUT: 30 * 60 * 1000,
    SUPPORTED_ALGORITHMS: [-7, -257],
    RP_ID: process.env.VERCEL_URL || 'african-group-tau.vercel.app',
    ORIGIN:
      process.env.ORIGIN ||
      `https://${process.env.VERCEL_URL || 'african-group-tau.vercel.app'}`,
  },

  async generateRegistrationOptions(user, existingCredentials = null) {
    try {
      return await fido2.generateRegistrationOptions({
        rpName: this.CONFIG.RP_NAME,
        rpID: this.CONFIG.RP_ID,
        userID: isoUint8Array.fromUTF8String(user.employee_id),
        userName: user.employee_id,
        displayName: user.name,
        timeout: this.CONFIG.TIMEOUT,
        attestationType: 'none',

        excludeCredentials:
          existingCredentials && existingCredentials.length > 0
            ? existingCredentials.map((cred) => ({
                id: this.normalizeCredentialId(cred.credential_id),
                type: 'public-key',
                transports: ['internal', 'platform', 'hybrid'],
              }))
            : [],

        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: true,
          residentKey: 'required',
        },
        supportedAlgorithmIDs: this.CONFIG.SUPPORTED_ALGORITHMS,
      })
    } catch (error) {
      console.error('Registration options generation error:', error)
      throw error
    }
  },

  async verifyRegistration(credential, challenge) {
    try {
      const verification = await fido2.verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: this.CONFIG.ORIGIN,
        expectedRPID: this.CONFIG.RP_ID,
        requireUserVerification: true,
      })

      if (!verification.verified) {
        throw new Error('Registration verification failed')
      }

      return {
        credential: {
          id: this.normalizeCredentialId(credential.id),
          publicKey: base64url.encode(
            verification.registrationInfo.credentialPublicKey
          ),
        },
        counter: verification.registrationInfo.counter,
        aaguid: verification.registrationInfo.aaguid,
      }
    } catch (error) {
      console.error('Registration verification error:', error)
      throw error
    }
  },

  async generateAuthenticationOptions() {
    try {
      return await fido2.generateAuthenticationOptions({
        timeout: this.CONFIG.TIMEOUT,
        rpID: this.CONFIG.RP_ID,
        userVerification: 'required',
      })
    } catch (error) {
      console.error('Authentication options generation error:', error)
      throw error
    }
  },

  async verifyAuthentication(credential, storedCredential, challenge) {
    try {
      const verification = await fido2.verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: this.CONFIG.ORIGIN,
        expectedRPID: this.CONFIG.RP_ID,
        credential: {
          id: this.normalizeCredentialId(storedCredential.credential_id),
          publicKey: storedCredential.public_key,
          counter: storedCredential.sign_count || 0,
        },
        requireUserVerification: true,
      })

      if (!verification.verified) {
        throw new Error('Authentication verification failed')
      }

      return verification
    } catch (error) {
      console.error('Authentication verification error:', error)
      throw error
    }
  },

  normalizeCredentialId(credentialId) {
    if (typeof credentialId === 'object') {
      if (credentialId.type === 'Buffer' && Array.isArray(credentialId.data)) {
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
  },
}

export default WebAuthnService
