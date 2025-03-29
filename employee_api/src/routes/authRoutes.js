import express from 'express'
import WebAuthnService from '../services/webauthnService.js'
import User from '../models/user.js'
import CredentialModel from '../models/CredentialModel.js'
import AttendanceModel from '../models/attendance.js'
import DeviceMiddleware from '../middlewares/deviceCheck.js'
import TimeHelper from '../utils/timeHelper.js'
import * as fido2 from '@simplewebauthn/server'
import CredentialHelper from '../utils/credentialHelper.js'
import base64url from 'base64url'

const router = express.Router()

router.post('/employee', async (req, res) => {
  try {
    const { employee_id } = req.body

    if (!employee_id || !/^AFG-[A-Z]\d{3,4}$/.test(employee_id)) {
      return res.status(400).send({ error: 'Invalid employee ID format' })
    }

    const user = await User.findByEmployeeId(employee_id)
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const credentials = await CredentialModel.findByEmployeeId(employee_id)

    const userResponse = {
      ...user,
      credentials: Array.isArray(credentials)
        ? credentials.map(CredentialHelper.formatCredential)
        : credentials
        ? [CredentialHelper.formatCredential(credentials)]
        : [],
    }


    req.session.employee_id = employee_id
    res.json(userResponse)
  } catch (error) {
    console.error('Employee lookup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post(
  '/registerRequest',
  DeviceMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const { employeeId } = req.body

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      const user = await User.findByEmployeeId(employeeId)
      if (!user) {
        return res.status(400).json({ error: 'Employee not found' })
      }

      const existingCredentials = await CredentialModel.findByEmployeeId(
        employeeId
      )

      const options = await WebAuthnService.generateRegistrationOptions(
        user,
        existingCredentials
      )

      res.json(options)
    } catch (error) {
      console.error('Registration request error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)


router.post(
  '/registerResponse',
  DeviceMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const { employeeId, challenge, ...credential } = req.body

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      if (!challenge) {
        return res.status(400).json({ error: 'Challenge is missing' })
      }

      if (!credential || !credential.rawId || !credential.response) {
        return res.status(400).json({ error: 'Invalid credential format' })
      }

      const verification = await fido2.verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: new URL(process.env.ORIGIN).origin,
        expectedRPID: new URL(process.env.ORIGIN).hostname,
        requireUserVerification: true,
      })

      const { verified, registrationInfo } = verification

      if (!verified) {
        throw new Error('Verification failed')
      }

      if (!registrationInfo || !registrationInfo.credential) {
        throw new Error('Missing registration information')
      }

      const aaguid = registrationInfo.aaguid
      const credentialID = registrationInfo.credential.id
      const credentialPublicKey = registrationInfo.credential.publicKey

      if (!credentialID) {
        throw new Error('Missing credential ID from registration info')
      }

      const credentialData = {
        employee_id: employeeId,
        credential_id: base64url.encode(credentialID),
        public_key: base64url.encode(credentialPublicKey),
        sign_count: registrationInfo.counter || 0,
        aaguid: aaguid ? aaguid : null,
        platform: credential.authenticatorAttachment || null,
        created_at: new Date(),
        last_used_at: null,
      }

      const newCredential = await CredentialModel.create(credentialData)

      res.json({
        success: true,
        credentialId: newCredential.credential_id,
      })

      console.log('Received AAGUID:', {
        originalAaguid: aaguid,
        type: typeof aaguid,
        base64Decoded: base64url.decode(aaguid),
        decodedString: base64url.decode(aaguid).toString('hex'),
      })
    } catch (error) {
      console.error('Detailed Error in registerResponse:', {
        message: error.message,
        stack: error.stack,
        originalError: error,
      })

      res.status(400).json({
        error: error.message,
        details: error.toString(),
      })
    }
  }
)

router.post(
  '/signinRequest',
  /* DeviceMiddleware.validatePlatform, */
  async (req, res) => {
    try {
      const { employeeId, type } = req.body

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      const authOptions = await WebAuthnService.generateAuthenticationOptions()

      res.json({
        publicKey: authOptions,
        signType: type || 'sign-in',
      })
    } catch (error) {
      console.error('Signin request error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

router.post(
  '/signinResponse',
  DeviceMiddleware.validatePlatform,
  async (req, res) => {
    try {
      const {
        employeeId,
        challenge,
        id: credentialId,
        authenticationType: signType,
        locationType,
        latitude,
        longitude,
      } = req.body

      if (locationType === 'site' || locationType === 'office') {
        if (!latitude || !longitude) {
          return res
            .status(400)
            .json({ error: 'Location coordinates are required' })
        }
      }

      if (!employeeId || !challenge || !credentialId) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      const employeeCredentials = await CredentialModel.findAllByEmployeeId(
        employeeId
      )
      if (!employeeCredentials || employeeCredentials.length === 0) {
        return res
          .status(400)
          .json({ error: 'No credentials found for employee' })
      }

      const storedCredential = employeeCredentials.find((cred) => {
        if (cred.credential_id === credentialId) return true

        try {
          const decodedStored = Buffer.from(
            cred.credential_id,
            'base64'
          ).toString()
          if (decodedStored === credentialId) return true
        } catch (e) {
          // Ignore decoding errors
        }

        try {
          const encodedRequest = Buffer.from(credentialId).toString('base64')
          if (encodedRequest === cred.credential_id) return true
        } catch (e) {
          // Ignore encoding errors
        }

        const normalizedStored = base64url.encode(
          base64url.decode(cred.credential_id)
        )
        const normalizedRequest = base64url.encode(
          base64url.decode(credentialId)
        )
        return normalizedStored === normalizedRequest
      })

      console.log('Request credential ID:', credentialId)
      console.log('Found credentials for employee:', employeeCredentials.length)

      employeeCredentials.forEach((cred, index) => {
        console.log(`Credential ${index + 1}:`, {
          original: cred.credential_id,
          normalized: WebAuthnService.normalizeCredentialId(cred.credential_id),
        })
      })

      console.log(
        'Normalized request credential ID:',
        WebAuthnService.normalizeCredentialId(credentialId)
      )

      if (!storedCredential) {
        return res
          .status(400)
          .json({ error: 'Credential not found for this employee' })
      }

      await WebAuthnService.verifyAuthentication(
        req.body,
        storedCredential,
        challenge
      )

      const timestamp = TimeHelper.getNigerianTime()
      await AttendanceModel.create({
        employeeId,
        timestamp: TimeHelper.getNigerianTime(),
        type: signType,
        name: storedCredential.user.name,
        location_type: locationType,
        latitude,
        longitude,
      })

      res.json({
        success: true,
        type: signType,
        message: `${
          signType === 'sign-in' ? 'Sign in' : 'Sign out'
        } successful`,
        timestamp,
      })
    } catch (error) {
      console.error('Signin response error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

router.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not sign out' })
    }
    res.redirect(302, '/')
  })
})

export default router
