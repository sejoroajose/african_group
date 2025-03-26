const TimeHelper = {
  getNigerianTime() {
    return new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Lagos',
    })
  },

  formatTimestamp(timestamp, format = 'full') {
    const date = new Date(timestamp)

    switch (format) {
      case 'short':
        return date.toLocaleDateString('en-US', {
          timeZone: 'Africa/Lagos',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

      case 'time':
        return date.toLocaleTimeString('en-US', {
          timeZone: 'Africa/Lagos',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })

      default: 
        return date.toLocaleString('en-US', {
          timeZone: 'Africa/Lagos',
          dateStyle: 'full',
          timeStyle: 'long',
        })
    }
  },

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)

    const durationMs = end - start
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    }
  },

  isBusinessDay(date) {
    const day = date.getDay()
    return day !== 0 && day !== 6 
  },

  getBusinessDaysInMonth(year, month) {
    const businessDays = []
    const date = new Date(year, month, 1)

    while (date.getMonth() === month) {
      if (this.isBusinessDay(date)) {
        businessDays.push(new Date(date))
      }
      date.setDate(date.getDate() + 1)
    }

    return businessDays
  },
}

export default TimeHelper
