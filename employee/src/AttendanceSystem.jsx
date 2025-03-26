import React, { useState, useEffect } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Bell, Check, Coffee, Sun, Moon } from 'lucide-react'
import { format } from 'date-fns'

const ATTENDANCE_QR_CODE =
  'At African Group, we are committed to delivering exceptional surveying, mapping, real estate, construction, and agro solutions across Africa and beyond.'

const isAndroid = /Android/i.test(navigator.userAgent)
const BASE_URL = isAndroid
  ? 'https://mcyouniverse-employee-android.onrender.com'
  : 'https://api.mcyouniverse.com'

const SIGN_IN_MESSAGES = [
  'Today is a great day to make an impact! Welcome!',
  'Rise and shine! Your contributions are valued today and always.',
  "Good morning! Ready to conquer today's challenges?",
  'Welcome! Your presence makes our team stronger.',
  "Another day, another opportunity to excel. Let's do this!",
  'The world is waiting for your brilliance today!',
  "Welcome! Today's achievements are tomorrow's successes.",
  'Good morning! Your dedication inspires us all.',
  "Ready for an amazing day? We're glad you're here!",
  "Welcome! Today's the perfect day to make a difference.",
]

const SIGN_OUT_MESSAGES = [
  'Have a wonderful evening! Rest well and recharge.',
  'Great job today! Enjoy your well-deserved time off.',
  'Your contributions today made a difference. Have a lovely evening!',
  'Time to relax and rejuvenate. See you soon!',
  'Thank you for your hard work today. Enjoy your evening!',
  'Well done today! Take time to unwind and refresh.',
  'Your efforts today were outstanding. Have a peaceful night!',
  'Until tomorrow! Enjoy your personal time.',
  'Rest well and come back energized. Have a great evening!',
  "Your dedication doesn't go unnoticed. Have a fantastic night!",
]

const getRandomMessage = (messageArray) => {
  const randomIndex = Math.floor(Math.random() * messageArray.length)
  return messageArray[randomIndex]
}

const CheckmarkAnimation = () => {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="relative rounded-full bg-green-100 p-6 animate-pulse">
        <Check className="h-12 w-12 text-green-600 animate-bounce" />
      </div>
    </div>
  )
}

const AttendanceSystem = () => {
  const [scanResult, setScanResult] = useState(null)
  const [showIdInput, setShowIdInput] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [employeeData, setEmployeeData] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [attendanceType, setAttendanceType] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
      disableScanFile: true,
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
      htmlContainer: document.getElementById('reader'),
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      accessibilityParams: {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    })

    setTimeout(() => {
      const style = document.createElement('style')
      style.textContent = `
          #reader__scan_region {
            background: transparent !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            border: 2px solid #455A64 !important;
          }
          #reader__dashboard_section_csr button {
            background: #263238 !important; /* Dark gray from logo */
            color: white !important;
            padding: 10px 20px !important;
            border-radius: 10px !important;
            margin: 12px 0 !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 6px rgba(38, 50, 56, 0.1) !important;
          }
          #reader__dashboard_section_csr button:hover {
            background: #8BC34A !important; /* Green from logo */
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 8px rgba(139, 195, 74, 0.15) !important;
          }
          #reader__camera_permission_button {
            color: white !important;
            background: #263238 !important; /* Dark gray from logo */
            padding: 10px 20px !important;
            border-radius: 10px !important;
            margin: 12px 0 !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
            box-shadow: 0 4px 6px rgba(38, 50, 56, 0.1) !important;
          }
          #reader__camera_permission_button:hover {
            background: #8BC34A !important; /* Green from logo */
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 8px rgba(139, 195, 74, 0.15) !important;
          }
          #reader__dashboard_section_swaplink {
            display: none !important;
          }
          #reader__dashboard_section_fileselection {
            display: none !important;
          }
          #reader__filescan_input {
            display: none !important;
          }
          #reader__filescan_input_label {
            display: none !important;
          }
          input[type="file"] {
            display: none !important;
          }
          #reader__dashboard_section {
            div:nth-child(2) {
              display: none !important;
            }
          }
          .custom-file-input {
            display: none !important;
          }
        `
      document.head.appendChild(style)
    }, 100)

    scanner.render(onSuccess, onError)

    function onSuccess(result) {
      if (result === ATTENDANCE_QR_CODE) {
        scanner.clear()
        setScanResult(result)
        setShowIdInput(true)
      }
    }

    function onError(err) {
      console.warn(err)
    }

    return () => {
      scanner.clear()
      const styleElement = document.querySelector('style')
      if (styleElement) {
        styleElement.remove()
      }
    }
  }, [])

  useEffect(() => {
    fetchAttendanceRecords(selectedDate)
  }, [selectedDate])

  const canSignOut = async (employeeId) => {
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(
      `https://api.mcyouniverse.com/api/attendance/daily?date=${today}`
    )
    if (!response.ok) return false

    const records = await response.json()
    return records.some(
      (record) =>
        record.employee_id.toUpperCase() === employeeId.toUpperCase() &&
        record.type === 'sign-in' &&
        new Date(record.timestamp).toISOString().split('T')[0] === today
    )
  }

  const base64UrlToBase64 = (base64Url) => {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return base64
  }

  const base64ToArrayBuffer = (base64) => {
    const standardBase64 = base64UrlToBase64(base64)
    const binaryString = atob(standardBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  const arrayBufferToBase64url = (buffer) => {
    const bytes = new Uint8Array(buffer)
    const binary = String.fromCharCode(...bytes)
    const base64 = window.btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer)
    return btoa(String.fromCharCode(...bytes))
  }

  const handleIdSubmit = async () => {
    try {
      setError('')
      setLoading(true)
      setSuccess(false)

      const upperCaseEmployeeId = employeeId.toUpperCase()
      const now = new Date()
      const hours = now.getHours()
      const type = hours < 12 ? 'sign-in' : 'sign-out'

      if (type === 'sign-out') {
        const hasSignedIn = await canSignOut(upperCaseEmployeeId)
        if (!hasSignedIn) {
          throw new Error('Cannot sign out without signing in first')
        }
      }

      const response = await fetch(
        `https://api.mcyouniverse.com/api/employees/${upperCaseEmployeeId}`
      )
      if (!response.ok) throw new Error('Employee not found')

      const data = await response.json()
      setEmployeeData(data)
      setAttendanceType(type)
      await handleAttendanceSubmit(data, type)
    } catch (error) {
      setError(error.message)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceSubmit = async (data, type) => {
    setLoading(true)
    setError('')

    try {
      const upperCaseEmployeeId = employeeId.toUpperCase()
      const employeeRes = await fetch(
        `https://api.mcyouniverse.com/api/employees/${upperCaseEmployeeId}`
      )
      if (!employeeRes.ok) throw new Error('Employee not found')

      const beginAuthEndpoint = isAndroid
        ? `${BASE_URL}/api/signinRequest`
        : `${BASE_URL}/api/employees/biometric/begin-auth`

      const beginAuthRes = await fetch(beginAuthEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: upperCaseEmployeeId, type: type }),
        credentials: 'include',
      })

      if (!beginAuthRes.ok) {
        const errorText = await beginAuthRes.text()
        throw new Error(`Begin auth failed: ${errorText}`)
      }

      const authOptions = await beginAuthRes.json()

      const publicKey = {
        ...authOptions.publicKey,
        challenge: base64ToArrayBuffer(authOptions.publicKey.challenge),
      }

      if (
        authOptions.publicKey.allowCredentials &&
        Array.isArray(authOptions.publicKey.allowCredentials)
      ) {
        publicKey.allowCredentials = authOptions.publicKey.allowCredentials.map(
          (cred) => ({
            ...cred,
            id: base64ToArrayBuffer(cred.id),
          })
        )
      }
      console.log('Auth options:', publicKey)

      const credential = await navigator.credentials.get({
        publicKey,
        mediation: 'optional',
      })

      if (!credential)
        throw new Error('Authentication failed - No credential returned')

      console.log('Credential obtained successfully:', credential)

      const credentialResponse = {
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        type: credential.type, 
        response: {
          clientDataJSON: arrayBufferToBase64url(
            credential.response.clientDataJSON
          ),
          authenticatorData: arrayBufferToBase64url(
            credential.response.authenticatorData
          ),
          signature: arrayBufferToBase64url(credential.response.signature),
        },
      }

      if (credential.response.userHandle) {
        credentialResponse.response.userHandle = arrayBufferToBase64url(
          credential.response.userHandle
        )
      }

      const assertionResponse = {
        ...credentialResponse,
        employeeId: upperCaseEmployeeId,
        authenticationType: type || 'sign-in',
        challenge: authOptions.publicKey.challenge,
      }

      if (credential.response.userHandle) {
        assertionResponse.response.userHandle = arrayBufferToBase64url(
          credential.response.userHandle
        )
      }

      console.log('Sending assertion response:', assertionResponse)

      const finishAuthEndpoint = isAndroid
        ? `${BASE_URL}/api/signinResponse`
        : `${BASE_URL}/api/employees/biometric/finish-auth`

      const finishAuthRes = await fetch(finishAuthEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertionResponse),
        credentials: 'include',
      })

      if (!finishAuthRes.ok) {
        const errorText = await finishAuthRes.text()
        throw new Error(`Attendance recording failed: ${errorText}`)
      }

      setSuccess(true)
      const messageType =
        type === 'sign-in' ? SIGN_IN_MESSAGES : SIGN_OUT_MESSAGES
      setSuccessMessage(getRandomMessage(messageType))

      fetchAttendanceRecords(selectedDate)
    } catch (error) {
      setError(error.message)
      console.error('Detailed error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceRecords = async (date) => {
    try {
      setError('')
      setLoading(true)
      const response = await fetch(
        `https://api.mcyouniverse.com/api/attendance/daily?date=${date}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records')
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        const adjustedRecords = data.map((record) => {
          const adjustedTime = new Date(record.timestamp)
          adjustedTime.setHours(adjustedTime.getHours() - 1)
          return {
            ...record,
            timestamp: adjustedTime.toISOString(),
          }
        })

        setAttendanceRecords(adjustedRecords)
        if (adjustedRecords.length === 0) {
          setError('No attendance recorded for today yet.')
        }
      } else {
        setError('No attendance recorded for today yet.')
      }
    } catch (error) {
      setError('Failed to fetch attendance records: ' + error.message)
      console.error('Error fetching attendance records:', error)
      setAttendanceRecords([])
    } finally {
      setLoading(false)
    }
  }

  const getTimeStyle = (time, type) => {
    const recordDate = new Date(time)
    const hours = recordDate.getHours()
    const minutes = recordDate.getMinutes()
    const totalMinutes = hours * 60 + minutes

    if (type === 'sign-in') {
      if (totalMinutes <= 9 * 60 + 1) {
        return 'text-green-600 font-medium'
      } else if (totalMinutes <= 11 * 60 + 59) {
        return 'text-amber-500 font-medium'
      }
    } else if (type === 'sign-out') {
      return 'text-gray-600 font-medium'
    }
  }

  const getTypeStyle = (time, type) => {
    if (type === 'sign-in') {
      const recordDate = new Date(time)
      const hours = recordDate.getHours()
      const minutes = recordDate.getMinutes()
      const totalMinutes = hours * 60 + minutes

      if (totalMinutes <= 9 * 60 + 1) {
        return 'bg-green-100 text-green-800 ring-1 ring-green-600/20'
      } else if (totalMinutes <= 11 * 60 + 59) {
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-600/20'
      }
    } else if (type === 'sign-out') {
      return 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20'
    }
  }

  const getSubmitButtonText = () => {
    const now = new Date()
    const hours = now.getHours()
    return hours < 12 ? 'Sign-In' : 'Sign-Out'
  }

  const getTimeIcon = () => {
    const now = new Date()
    const hours = now.getHours()
    return hours < 12 ? (
      <Sun className="h-5 w-5 text-amber-500 mr-2" />
    ) : (
      <Moon className="h-5 w-5 text-blue-500 mr-2" />
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-3xl mx-auto p-4 space-y-8">
        <div className="flex justify-center py-4">
          <img
            src="logo.jpg"
            className="max-w-[280px] h-auto"
            alt="African Group Logo"
          />
        </div>

        <header className="bg-gradient-to-r from-[#455A64] to-[#263238] text-white p-6 rounded-xl shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold break-words flex items-center">
            <Bell className="h-6 w-6 mr-3 text-[#8BC34A]" />
            Employee Attendance System
          </h1>
          <p className="mt-2 text-gray-300 text-sm">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex flex-col items-center">
            <CheckmarkAnimation />
            <p className="text-center font-medium text-lg">
              {attendanceType === 'sign-in'
                ? 'Sign-In Successful!'
                : 'Sign-Out Successful!'}
            </p>
            <p className="text-center mt-2">{successMessage}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-lg">
          <div className="border-b border-gray-200 bg-gradient-to-r from-[#263238] to-[#8BC34A] text-white p-5">
            <h2 className="text-xl font-semibold flex items-center">
              <Coffee className="h-5 w-5 mr-2" />
              Scan Attendance QR Code
            </h2>
          </div>
          <div className="p-6">
            {!showIdInput && <div id="reader" className="w-full max-w-full" />}

            {showIdInput && !success && (
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-lg">
                  {getTimeIcon()}
                  <span className="font-medium">
                    {new Date().getHours() < 12
                      ? 'Good Morning! Please sign in.'
                      : 'Good Afternoon! Please sign out.'}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full p-3 text-black bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-red-900 transition-all"
                  disabled={loading}
                />
                <button
                  onClick={handleIdSubmit}
                  className="w-full bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none flex items-center justify-center"
                  disabled={loading || !employeeId}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    getSubmitButtonText()
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-lg">
          <div className="border-b border-gray-200 bg-gradient-to-r from-black to-gray-800 text-white p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Attendance Records
              </h2>
              <div className="flex items-center space-x-4 w-full sm:w-auto">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 rounded-lg text-white bg-transparent border border-gray-600 w-full sm:w-auto focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  max={new Date().toISOString().split('T')[0]}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto"></div>
                <p className="mt-3 text-gray-600">Loading records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {attendanceRecords.length > 0 ? (
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-1 sm:px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
                              {record.name}
                            </td>
                            <td
                              className={`px-3 sm:px-6 py-4 text-sm ${getTimeStyle(
                                record.timestamp,
                                record.type
                              )}`}
                            >
                              {new Date(record.timestamp).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-4">
                              <span
                                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeStyle(
                                  record.timestamp,
                                  record.type
                                )}`}
                              >
                                {record.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-400 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-4 text-gray-500 text-lg">
                      No attendance records found for this date
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-center py-6 text-gray-500 text-sm">
        <p>© {new Date().getFullYear()}African Group. All Rights Reserved.</p>
        <p className="mt-1 text-xs text-gray-400">
          Delivering excellence in surveying, mapping, and beyond.
        </p>
      </div>
    </div>
  )
}

export default AttendanceSystem
