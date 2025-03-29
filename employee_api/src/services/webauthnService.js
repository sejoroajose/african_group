import * as fido2 from '@simplewebauthn/server'
import { isoUint8Array } from '@simplewebauthn/server/helpers'
import base64url from 'base64url'

const WebAuthnService = {
  CONFIG: {
    RP_NAME: 'African Group NG Employee Attendance System',
    TIMEOUT: 30 * 60 * 1000,
    SUPPORTED_ALGORITHMS: [-7, -257],
    RP_ID: 'african-group-tau.vercel.app',
    ORIGIN: 'african-group-tau.vercel.app',
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

  normalizeCredentialId(credentialId) {
    try {
      if (credentialId === undefined || credentialId === null) {
        throw new Error('Credential ID is undefined or null')
      }

      if (typeof credentialId === 'string') {
        return base64url.encode(base64url.decode(credentialId))
      }

      if (credentialId instanceof Buffer) {
        return base64url.encode(credentialId)
      }

      if (credentialId instanceof ArrayBuffer) {
        return base64url.encode(Buffer.from(credentialId))
      }

      if (credentialId.type === 'Buffer' && Array.isArray(credentialId.data)) {
        return base64url.encode(Buffer.from(credentialId.data))
      }

      if (Array.isArray(credentialId) || ArrayBuffer.isView(credentialId)) {
        return base64url.encode(Buffer.from(credentialId))
      }

      throw new Error('Unable to normalize credential ID')
    } catch (error) {
      console.error('Credential ID normalization error:', error)
      throw error
    }
  },

  async verifyRegistration(credential, challenge) {
    try {
      // Extensive validation
      if (!credential) {
        throw new Error('Credential object is undefined or null')
      }

      // Check for id or rawId
      const credentialId = credential.id || credential.rawId
      if (!credentialId) {
        console.error(
          'Full Credential Object:',
          JSON.stringify(credential, null, 2)
        )
        throw new Error('Credential ID is missing or undefined')
      }

      // Ensure response object exists
      if (!credential.response) {
        throw new Error('Credential response is missing')
      }

      // Check for required response properties
      if (!credential.response.attestationObject) {
        throw new Error('Attestation object is missing')
      }
      if (!credential.response.clientDataJSON) {
        throw new Error('Client data JSON is missing')
      }

      const verificationOptions = {
        response: {
          attestationObject: base64url.toBuffer(
            credential.response.attestationObject
          ),
          clientDataJSON: base64url.toBuffer(
            credential.response.clientDataJSON
          ),
        },
        expectedChallenge: challenge,
        expectedOrigin: this.CONFIG.ORIGIN,
        expectedRPID: this.CONFIG.RP_ID,
        requireUserVerification: true,
        credential: {
          id: base64url.toBuffer(credentialId),
        },
      }

      const verification = await fido2.verifyRegistrationResponse(
        verificationOptions
      )

      if (!verification.verified) {
        throw new Error('Registration verification failed')
      }

      const registrationInfo = verification.registrationInfo
      if (!registrationInfo) {
        throw new Error('No registration information found')
      }

      return {
        credential: {
          id: base64url.encode(verificationOptions.credential.id),
          publicKey: base64url.encode(registrationInfo.credentialPublicKey),
        },
        counter: registrationInfo.counter,
        aaguid: registrationInfo.aaguid,
      }
    } catch (error) {
      console.error('Detailed registration verification error:', {
        message: error.message,
        stack: error.stack,
        credential: JSON.stringify(credential, null, 2),
      })
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


  async verifyAuthentication(authResponse, storedCredential, expectedChallenge) {
    try {
      const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');

      console.log('Credential being used for verification:', {
        id: storedCredential.credential_id,
        publicKeyLength: storedCredential.public_key
          ? base64url.toBuffer(storedCredential.public_key).length
          : 'no public key',
        counter: storedCredential.sign_count || 0,
      });

      console.log('Auth response structure:', Object.keys(authResponse));
      
      const verification = await verifyAuthenticationResponse({
        response: authResponse,  
        expectedChallenge: expectedChallenge,  
        expectedOrigin: new URL(process.env.ORIGIN).origin,
        expectedRPID: new URL(process.env.ORIGIN).hostname,
        credential: {
          id: storedCredential.credential_id,  
          publicKey: base64url.toBuffer(storedCredential.public_key),
          counter: storedCredential.sign_count || 0,
        },
      });

      if (!verification.verified) {
        throw new Error('Authentication verification failed');
      }

      if (verification.authenticationInfo && verification.authenticationInfo.newCounter > storedCredential.sign_count) {
        await storedCredential.updateAuthenticationMetadata(
          verification.authenticationInfo.newCounter
        );
      }

      return verification;
    } catch (error) {
      console.error('Authentication verification error:', error);
      throw error;
    }
  },

  normalizeCredentialId(credentialId) {
    try {
      if (credentialId === undefined || credentialId === null) {
        throw new Error('Credential ID is undefined or null')
      }

      let rawBytes
      if (typeof credentialId === 'string') {
        try {
          rawBytes = base64url.decode(credentialId)
        } catch (e) {
          rawBytes = credentialId
        }
      } else if (Buffer.isBuffer(credentialId)) {
        rawBytes = credentialId.toString()
      } else {
        rawBytes = Buffer.from(credentialId).toString()
      }

      return base64url.encode(rawBytes)
    } catch (error) {
      console.error(
        'Credential ID normalization error:',
        error,
        'Input:',
        credentialId
      )
      throw error
    }
  },
}

export default WebAuthnService
