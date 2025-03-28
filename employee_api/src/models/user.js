import { v4 as uuidv4 } from 'uuid'
import db from '../config/database.js'

class User {
  constructor({
    id = uuidv4(),
    employee_id,
    name,
    email,
    department,
    role,
    active = true,
    created_at = new Date(),
    updated_at = new Date(),
  }) {
    this.id = id
    this.employee_id = employee_id
    this.name = name
    this.email = email
    this.department = department
    this.role = role
    this.active = active
    this.created_at = created_at
    this.updated_at = updated_at
  }

  toInsertQuery() {
    return {
      text: `
        INSERT INTO employees 
        (id, employee_id, name, email, department, role, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (employee_id) DO UPDATE 
        SET 
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          department = EXCLUDED.department,
          role = EXCLUDED.role,
          updated_at = EXCLUDED.updated_at
      `,
      values: [
        this.id,
        this.employee_id,
        this.name,
        this.email,
        this.department,
        this.role,
        this.active,
        this.created_at,
        this.updated_at,
      ],
    }
  }

  validate() {
    const errors = []
    if (!this.employee_id || !/^AFG-[A-Z]\d{3,4}$/.test(this.employee_id)) {
      errors.push('Invalid employee ID format')
    }
    if (!this.name) {
      errors.push('Name is required')
    }
    if (!this.email || !/\S+@\S+\.\S+/.test(this.email)) {
      errors.push('Invalid email format')
    }
    return errors
  }
  static async findByEmployeeId(employee_id) {
    const query = {
      text: 'SELECT * FROM employees WHERE employee_id = $1',
      values: [employee_id],
    }
    try {
      const result = await db.pool.query(query)
      if (result.rows.length === 0) {
        return null
      }
      return new User(result.rows[0])
    } catch (error) {
      console.error('Error querying for employee:', error)
      throw error
    }
  }
}

export default User
