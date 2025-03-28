import AttendanceModel from '../models/attendance.js'
import TimeHelper from '../utils/timeHelper.js'

const AttendanceService = {
  async getAttendanceHistory(employeeId, startDate, endDate) {
    try {
      const validatedStartDate = new Date(startDate)
      const validatedEndDate = new Date(endDate)

      const records = await AttendanceModel.findByDateRange(
        employeeId,
        validatedStartDate,
        validatedEndDate
      )

      return records.map((record) => ({
        ...record,
        timestamp: TimeHelper.formatTimestamp(record.timestamp),
      }))
    } catch (error) {
      console.error('Failed to retrieve attendance history:', error)
      throw error
    }
  },

  async generateMonthlyReport(employeeId, month, year) {
    try {
      const validMonth = parseInt(month, 10)
      const validYear = parseInt(year, 10)

      const startDate = new Date(validYear, validMonth - 1, 1)
      const endDate = new Date(validYear, validMonth, 0)

      const records = await AttendanceModel.findByDateRange(
        employeeId,
        startDate,
        endDate
      )

      const report = {
        employeeId,
        month: validMonth,
        year: validYear,
        totalWorkDays: 0,
        presentDays: 0,
        absentDays: 0,
        workHours: 0,
        signIns: [],
        signOuts: [],
      }

      records.forEach((record) => {
        if (record.type === 'sign-in') {
          report.signIns.push(record)
        } else if (record.type === 'sign-out') {
          report.signOuts.push(record)
        }
      })

      const businessDays = this.calculateBusinessDays(startDate, endDate)
      report.totalWorkDays = businessDays
      report.presentDays = report.signIns.length
      report.absentDays = businessDays - report.presentDays

      report.workHours = this.calculateWorkHours(
        report.signIns,
        report.signOuts
      )

      return report
    } catch (error) {
      console.error('Failed to generate monthly report:', error)
      throw error
    }
  },

  async getDailyAttendance(startOfDay, endOfDay) {
    try {
      console.log('Fetching daily attendance:')
      console.log('Start of Day (UTC):', startOfDay.toISOString())
      console.log('End of Day (UTC):', endOfDay.toISOString())

      const records = await AttendanceModel.findByDateRange(
        startOfDay,
        endOfDay
      )

      console.log('Raw Records Found:', records.length)
      console.log('First Record (if any):', records[0] || 'No records')

      const formattedRecords = records.map((record) => {
        const localTimestamp = new Date(record.timestamp)
        return {
          ...record,
          timestamp: TimeHelper.formatTimestamp(localTimestamp),
        }
      })

      return formattedRecords
    } catch (error) {
      console.error('Failed to retrieve daily attendance:', error)
      throw error
    }
  },
  calculateBusinessDays(startDate, endDate) {
    let count = 0
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return count
  },

  calculateWorkHours(signIns, signOuts) {
    let totalHours = 0

    for (let i = 0; i < Math.min(signIns.length, signOuts.length); i++) {
      const signIn = new Date(signIns[i].timestamp)
      const signOut = new Date(signOuts[i].timestamp)

      const hoursDiff = (signOut - signIn) / (1000 * 60 * 60)
      totalHours += hoursDiff
    }

    return Math.round(totalHours * 100) / 100
  },
}

export default AttendanceService
