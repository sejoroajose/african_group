import express from 'express'
import WebAuthnService from '../services/webauthnService.js'
import UserModel from '../models/user.js'
import CredentialModel from '../models/credentialModel.js'
import DeviceMiddleware from '../middlewares/deviceCheck.js'
import TimeHelper from '../utils/timeHelper.js'
import CredentialHelper from '../utils/credentialHelper.js'

const router = express.Router()

router.post('/employee', async (req, res) => {
  try {
    const { employee_id } = req.body

    if (!employee_id || !/^AG-\d{3}$/.test(employee_id)) {
      return res.status(400).send({ error: 'Invalid employee ID format' })
    }

    const user = await UserModel.findByEmployeeId(employee_id)
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const credentials = await CredentialModel.findByEmployeeId(employee_id)

    const userResponse = {
      ...user,
      credentials: credentials.map(CredentialHelper.formatCredential),
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
      const { employeeId, challenge, ...credential } = req.body

      if (!employeeId || !challenge) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      const registrationInfo = await WebAuthnService.verifyRegistration(
        credential,
        challenge
      )

      await CredentialModel.create({
        employeeId,
        credentialId: registrationInfo.credential.id,
        publicKey: registrationInfo.credential.publicKey,
        signCount: registrationInfo.counter,
        aaguid: registrationInfo.aaguid,
      })

      res.json({ success: true })
    } catch (error) {
      console.error('Registration response error:', error)
      res.status(400).json({ error: error.message })
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
      } = req.body

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
        timestamp,
        type: signType,
        name: storedCredential.user.name,
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
