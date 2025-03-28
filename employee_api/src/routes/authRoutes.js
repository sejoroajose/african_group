import express from 'express'
import WebAuthnService from '../services/webauthnService.js'
import UserModel from '../models/user.js'
import CredentialModel from '../models/CredentialModel.js'
import AttendanceModel from '../models/attendance.js'
import DeviceMiddleware from '../middlewares/deviceCheck.js'
import TimeHelper from '../utils/timeHelper.js'
import CredentialHelper from '../utils/credentialHelper.js'

const router = express.Router()

router.post('/employee', async (req, res) => {
  try {
    const { employee_id } = req.body

    if (!employee_id || !/^AFG-[A-Z]\d{3,4}$/.test(employee_id)) {
      return res.status(400).send({ error: 'Invalid employee ID format' })
    }

    const user = await UserModel.findByEmployeeId(employee_id)
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const credentials = await CredentialModel.findByEmployeeId(employee_id)

    const userResponse = {
      ...user,
      credentials: credentials
        ? credentials.map(CredentialHelper.formatCredential)
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

      const user = await UserModel.findByEmployeeId(employeeId)
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
      const { employeeId, challenge, ...credentialData } = req.body

      // Comprehensive validation
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      if (!challenge) {
        return res.status(400).json({ error: 'Challenge is required' })
      }

      if (!credentialData || Object.keys(credentialData).length === 0) {
        return res.status(400).json({ error: 'Credential data is missing' })
      }

      // Detailed logging
      console.log('Registration Request Details:', {
        employeeId,
        challengeLength: challenge.length,
        credentialDataKeys: Object.keys(credentialData),
        credentialId: credentialData.id || credentialData.rawId,
        responseKeys: credentialData.response
          ? Object.keys(credentialData.response)
          : 'No response object',
      })

      const registrationInfo = await WebAuthnService.verifyRegistration(
        credentialData,
        challenge
      )

      // Additional validation of registration info
      if (!registrationInfo.credential.id) {
        throw new Error('Credential ID could not be normalized')
      }

      if (!registrationInfo.credential.publicKey) {
        throw new Error('Public key is required')
      }

      const createdCredential = await CredentialModel.create({
        employeeId,
        credentialId: registrationInfo.credential.id,
        publicKey: registrationInfo.credential.publicKey,
        signCount: registrationInfo.counter,
        aaguid: registrationInfo.aaguid,
      })

      // Log successful credential creation
      console.log('Credential Successfully Created', {
        employeeId,
        credentialId: createdCredential.credentialId,
      })

      res.json({ success: true })
    } catch (error) {
      // Extensive error logging
      console.error('Full registration response error:', {
        message: error.message,
        stack: error.stack,
        employeeId,
        challenge: challenge ? 'Present' : 'Missing',
        credentialData: JSON.stringify(credentialData),
      })

      // Provide more detailed error response
      res.status(400).json({
        error: error.message,
        details: error.toString(),
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })
    }
  }
)

router.post(
  '/signinRequest',
  DeviceMiddleware.validatePlatform,
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

      const storedCredential = await CredentialModel.findByCredentialId(
        credentialId
      )
      if (!storedCredential) {
        return res.status(400).json({ error: 'Credential not found' })
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
