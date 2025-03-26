const DeviceMiddleware = {
  validatePlatform: (req, res, next) => {
    const userAgent = req.header('User-Agent') || ''
    const platform = DeviceMiddleware.detectPlatform(userAgent)

    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        error: 'This route is only accessible from mobile devices',
        supportedPlatforms: ['Android', 'iOS'],
      })
    }

    req.platform = platform
    next()
  },

  detectPlatform: (userAgent) => {
    userAgent = userAgent.toLowerCase()

    if (userAgent.includes('android')) return 'android'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios'

    return 'unknown'
  },

  getOrigin: (userAgent) => {
    const platform = DeviceMiddleware.detectPlatform(userAgent)

    switch (platform) {
      case 'android':
        return {
          origin: process.env.ANDROID_ORIGIN,
          type: 'android',
        }
      case 'ios':
        return {
          origin: process.env.IOS_ORIGIN,
          type: 'ios',
        }
      default:
        return {
          origin: process.env.WEB_ORIGIN,
          type: 'web',
        }
    }
  },
}

export default DeviceMiddleware
