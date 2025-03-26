import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const createDatabaseConfig = () => {
  const config = {
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ,
    database: process.env.DB_NAME ,
    ssl: {
      rejectUnauthorized: false,
      ca: process.env.DB_SSL_CERT,
    },
  }

  const pool = new pg.Pool(config)

  const testConnection = async () => {
    try {
      const result = await pool.query('SELECT VERSION()')
      console.log('Database connected:', result.rows[0].version)
      return pool
    } catch (err) {
      console.error('Database connection error:', err)
      throw err
    }
  }

  return {
    pool,
    testConnection,
  }
}

export default createDatabaseConfig()
