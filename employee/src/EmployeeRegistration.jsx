import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { UserCircle, Fingerprint, AlertCircle, CheckCircle } from 'lucide-react'

const isAndroid = /Android/i.test(navigator.userAgent)
const BASE_URL = isAndroid
  ? 'https://mcyouniverse-employee-android.onrender.com'
  : 'https://api.mcyouniverse.com'

const EmployeeRegistration = () => {
  const [employeeId, setEmployeeId] = useState('')
  const [employeeData, setEmployeeData] = useState(null)
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [error, setError] = useState('')

  const fetchEmployee = async () => {
    try {
      setError('')
      setRegistrationStatus('')
      const encodedId = encodeURIComponent(employeeId)
      const response = await fetch(
        `https://api.mcyouniverse.com/api/employees/${encodedId}`
      )

      if (response.ok) {
        const data = await response.json()
        setEmployeeData(data)
      } else {
        setError('Employee not found')
        setEmployeeData(null)
      }
    } catch (error) {
      setError('Network error. Please try again.')
      setEmployeeData(null)
    }
  }

  const handleBiometricRegistration = async () => {
    try {
      setError('')
      setRegistrationStatus('')

      // Store challenge for later use
      let challengeStr = ''

      const beginRegistration = isAndroid
        ? `${BASE_URL}/api/registerRequest`
        : `${BASE_URL}/api/employees/biometric/begin`

      console.log('Making request to:', beginRegistration)
      console.log('With payload:', JSON.stringify({ employeeId }))

      const beginResponse = await fetch(beginRegistration, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
        credentials: 'include',
      })

      if (!beginResponse.ok) {
        const errorText = await beginResponse.text()
        console.error('Begin registration failed:', errorText)
        throw new Error(errorText)
      }

      const responseData = await beginResponse.json()
      const options = responseData.publicKey
        ? responseData.publicKey
        : responseData

      console.log('Received options:', JSON.stringify(options))

      // Save the original challenge string for later
      challengeStr = options.challenge

      // Create a clean copy of options for WebAuthn
      const transformedOptions = structuredClone(options)

      // Convert challenge to ArrayBuffer
      transformedOptions.challenge = base64urlToArrayBuffer(options.challenge)

      // Convert user ID to ArrayBuffer if it exists
      if (transformedOptions.user && transformedOptions.user.id) {
        transformedOptions.user.id = base64urlToArrayBuffer(
          transformedOptions.user.id
        )
      }

      // Convert excludeCredentials IDs to ArrayBuffer
      if (
        transformedOptions.excludeCredentials &&
        Array.isArray(transformedOptions.excludeCredentials)
      ) {
        transformedOptions.excludeCredentials =
          transformedOptions.excludeCredentials.map((cred) => ({
            ...cred,
            id: base64urlToArrayBuffer(cred.id),
          }))
      }

      console.log('Using transformed options:', transformedOptions)

      try {
        const credential = await navigator.credentials.create({
          publicKey: transformedOptions,
        })

        console.log('Credential created successfully', credential)

        // Serialize the credential for transmission
        const serializedCredential = publicKeyCredentialToJSON(credential)
        console.log('Serialized credential:', serializedCredential)

        const finishRegistration = isAndroid
          ? `${BASE_URL}/api/registerResponse`
          : `${BASE_URL}/api/employees/biometric/finish`

        // For Android, we need to include the original challenge string and employeeId
        const requestBody = isAndroid
          ? {
              ...serializedCredential,
              challenge: challengeStr, // Use the original challenge string
              employeeId,
            }
          : serializedCredential

        console.log('Sending to finish endpoint:', finishRegistration)
        console.log('With payload:', JSON.stringify(requestBody))

        const finishResponse = await fetch(finishRegistration, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'include',
        })

        if (!finishResponse.ok) {
          const errorText = await finishResponse.text()
          console.error('Finish registration failed:', errorText)
          throw new Error(errorText || 'Registration failed')
        }

        const finishResult = await finishResponse.json()
        console.log('Registration completed successfully:', finishResult)

        setRegistrationStatus('Biometric registration successful')
        setEmployeeData(null)
        setEmployeeId('')
      } catch (credentialError) {
        console.error('Credential error:', credentialError)
        throw credentialError
      }
    } catch (error) {
      console.error('Full error object:', error)
      setError(`Biometric registration failed: ${error.message}`)
    }
  }

  function base64urlToArrayBuffer(base64url) {
    if (!base64url || typeof base64url !== 'string') {
      console.error('Invalid base64url input:', base64url)
      return new ArrayBuffer(0)
    }

    try {
      const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding
      const binary = window.atob(base64)
      const buffer = new ArrayBuffer(binary.length)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i)
      }
      return buffer
    } catch (error) {
      console.error('Error converting base64url to ArrayBuffer:', error)
      return new ArrayBuffer(0)
    }
  }

  function publicKeyCredentialToJSON(credential) {
    if (!credential) {
      throw new Error('Credential is null or undefined')
    }

    try {
      const convert = (buffer) => {
        if (!buffer) return ''
        if (
          !(buffer instanceof ArrayBuffer) &&
          !(buffer instanceof Uint8Array)
        ) {
          return String(buffer)
        }
        const bytes = new Uint8Array(buffer)
        const binary = Array.from(bytes)
          .map((byte) => String.fromCharCode(byte))
          .join('')
        return btoa(binary)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
      }

      if (!credential.response) {
        throw new Error('Credential response is missing')
      }

      const result = {
        id: credential.id,
        rawId: convert(credential.rawId),
        type: credential.type,
        response: {},
      }

      // Add attestation object and client data if they exist
      if (credential.response.attestationObject) {
        result.response.attestationObject = convert(
          credential.response.attestationObject
        )
      }

      if (credential.response.clientDataJSON) {
        result.response.clientDataJSON = convert(
          credential.response.clientDataJSON
        )
      }

      return result
    } catch (error) {
      console.error('Error converting credential to JSON:', error)
      throw new Error(`Failed to serialize credential: ${error.message}`)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-2 bg-[#7C050B] w-full"></div>
        <div className="flex justify-center py-4 border-b">
          <img
            src="https://res.cloudinary.com/dnu6az3um/image/upload/v1736111485/logo_fip3gr.svg"
            className="max-w-[180px] h-auto"
            alt="Company Logo"
          />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-[#7C050B] font-semibold flex items-center gap-2">
            <Fingerprint size={20} />
            Employee Biometric Credentials Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800 focus:ring-2 focus:ring-[#7C050B] focus:border-[#7C050B] transition-all"
              />
              <button
                onClick={fetchEmployee}
                disabled={!employeeId}
                className="mt-2 w-full bg-[#7C050B] hover:bg-[#5e0409] text-white p-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#7C050B]"
              >
                Find Employee
              </button>
            </div>

            {employeeData && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h3 className="font-medium text-gray-800 mb-2">
                    Employee Details
                  </h3>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 text-gray-700">
                    <span className="font-medium">Name:</span>
                    <span>{employeeData.name}</span>
                    <span className="font-medium">ID:</span>
                    <span>{employeeData.employee_id}</span>
                  </div>
                </div>

                <button
                  onClick={handleBiometricRegistration}
                  className="w-full bg-[#7C050B] hover:bg-[#5e0409] text-white p-3 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Fingerprint size={18} />
                  Register Biometrics
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {registrationStatus && (
              <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-start gap-2">
                <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{registrationStatus}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeRegistration
