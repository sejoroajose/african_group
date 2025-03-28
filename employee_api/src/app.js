import express from 'express'
import session from 'express-session'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import database from './config/database.js'
import authRoutes from './routes/authRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'

const app = express()

app.use(helmet()) 
app.use((req, res, next) => {
  console.log('CORS - Origin:', req.headers.origin)
  console.log('CORS - Allowed Origins:', process.env.ALLOWED_ORIGINS)
  next()
})
app.use(
  cors({
    origin: 'https://african-group-tau.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
})
app.use(limiter)


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/auth', authRoutes)
app.use('/attendance', attendanceRoutes)

database
  .testConnection()
  .then(() => {
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })

export default app
