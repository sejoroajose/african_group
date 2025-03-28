import express from 'express'
import AttendanceService from '../services/attendanceService.js'
const router = express.Router()

router.get(
  '/history',
  async (req, res) => {
    try {
      const employeeId = req.session.employeeId

      if (!employeeId) {
        return res.status(400).json({ error: 'No employee ID in session' })
      }

      const startDate =
        req.query.startDate ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]

      const endDate =
        req.query.endDate ||
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]

      const attendanceRecords = await AttendanceService.getAttendanceHistory(
        employeeId,
        startDate,
        endDate
      )

      res.json(attendanceRecords)
    } catch (error) {
      console.error('Error retrieving attendance history:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get('/daily', async (req, res) => {
  try {
    const dateParam = req.query.date
    console.log('Received Date Parameter:', dateParam)

    const targetDate = dateParam
      ? new Date(dateParam + 'T00:00:00') 
      : new Date()

    console.log('Parsed Target Date (Local):', targetDate.toISOString())

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const utcStartOfDay = new Date(startOfDay.toUTCString())
    const utcEndOfDay = new Date(endOfDay.toUTCString())

    console.log('Start of Day (Local):', startOfDay.toISOString())
    console.log('Start of Day (UTC):', utcStartOfDay.toISOString())
    console.log('End of Day (Local):', endOfDay.toISOString())
    console.log('End of Day (UTC):', utcEndOfDay.toISOString())

    const dailyRecords = await AttendanceService.getDailyAttendance(
      utcStartOfDay,
      utcEndOfDay
    )

    console.log('Records to Send:', dailyRecords.length)

    res.status(200).json(dailyRecords)
  } catch (error) {
    console.error('Error retrieving daily attendance:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get(
  '/report',
  async (req, res) => {
    try {
      const employeeId = req.session.employeeId

      if (!employeeId) {
        return res.status(400).json({ error: 'No employee ID in session' })
      }

      const month = req.query.month || new Date().getMonth() + 1
      const year = req.query.year || new Date().getFullYear()

      const report = await AttendanceService.generateMonthlyReport(
        employeeId,
        month,
        year
      )

      res.json(report)
    } catch (error) {
      console.error('Error generating attendance report:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
