import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { UserCircle, Fingerprint, AlertCircle, CheckCircle } from 'lucide-react'

const BASE_URL = 'http://localhost:3000'

const EmployeeRegistration = () => {
  const [employeeId, setEmployeeId] = useState('')
  const [employeeData, setEmployeeData] = useState(null)
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [error, setError] = useState('')

  const fetchEmployee = async () => {
    try {
      setError('')
      setRegistrationStatus('')
      const response = await fetch(`${BASE_URL}/auth/employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employee_id: employeeId }),
      })

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

      let challengeStr = ''

      const beginRegistration = `${BASE_URL}/auth/registerRequest`

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

      challengeStr = options.challenge

      const transformedOptions = structuredClone(options)

      transformedOptions.challenge = base64urlToArrayBuffer(options.challenge)

      if (transformedOptions.user && transformedOptions.user.id) {
        transformedOptions.user.id = base64urlToArrayBuffer(
          transformedOptions.user.id
        )
      }

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

        const serializedCredential = publicKeyCredentialToJSON(credential)
        console.log('Serialized credential:', serializedCredential)

        const finishRegistration = `${BASE_URL}/auth/registerResponse`

        const requestBody = {
          employeeId,
          challenge: challengeStr,
          ...serializedCredential,
        }

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
        <div className="h-2 bg-[#263238] w-full"></div>
        <div className="flex justify-center py-4 border-b">
          <img
            src="logo.jpg"
            className="max-w-[180px] h-auto"
            alt="Company Logo"
          />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-[#8BC34A] font-semibold flex items-center gap-2">
            <Fingerprint size={20} />
            Employee Passkey Credentials Registration
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
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800 focus:ring-2 focus:ring-[#8BC34A] focus:border-[#8BC34A] transition-all"
              />
              <button
                onClick={fetchEmployee}
                disabled={!employeeId}
                className="mt-2 w-full bg-[#8BC34A] hover:bg-[#263238] text-white p-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:hover:bg-[#263238]"
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
                  <div className="grid grid-cols-[auto_1fr] text-left gap-x-2 text-gray-700 w-full max-w-full">
                    <span className="font-medium truncate">Name:</span>
                    <span className="truncate overflow-hidden">
                      {employeeData.name}
                    </span>
                    <span className="font-medium truncate">ID:</span>
                    <span className="truncate overflow-hidden">
                      {employeeData.employee_id}
                    </span>
                    <span className="font-medium truncate">Email:</span>
                    <span className="truncate overflow-hidden">
                      {employeeData.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBiometricRegistration}
                  className="w-full bg-[#8BC34A] hover:bg-[#263238] text-white p-3 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Fingerprint size={18} />
                  Register Passkey
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
