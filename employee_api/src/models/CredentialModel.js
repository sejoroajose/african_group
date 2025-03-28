import { v4 as uuidv4 } from 'uuid'
import db from '../config/database.js'

class CredentialModel {
  constructor({
    id = uuidv4(),
    employee_id,
    credential_id,
    public_key,
    sign_count = 0,
    aaguid = null,
    platform = null,
    created_at = new Date(),
    last_used_at = null,
  }) {
    this.id = id
    this.employee_id = employee_id
    this.credential_id = credential_id
    this.public_key = public_key
    this.sign_count = sign_count
    this.aaguid = aaguid
    this.platform = platform
    this.created_at = created_at
    this.last_used_at = last_used_at
  }

  toInsertQuery() {
    return {
      text: `
        INSERT INTO webauthn_credentials 
        (id, employee_id, credential_id, public_key, sign_count, aaguid, platform, created_at, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (credential_id) DO UPDATE 
        SET 
          sign_count = EXCLUDED.sign_count,
          last_used_at = EXCLUDED.last_used_at
      `,
      values: [
        this.id,
        this.employee_id,
        this.credential_id,
        this.public_key,
        this.sign_count,
        this.aaguid,
        this.platform,
        this.created_at,
        this.last_used_at,
      ],
    }
  }

  validate() {
    const errors = []

    if (!this.employee_id) {
      errors.push('Employee ID is required')
    }

    if (!this.credential_id) {
      errors.push('Credential ID is required')
    }

    if (!this.public_key) {
      errors.push('Public key is required')
    }

    return errors
  }

  updateAuthenticationMetadata(newSignCount) {
    this.sign_count = newSignCount
    this.last_used_at = new Date()

    return {
      text: `
        UPDATE webauthn_credentials 
        SET sign_count = $1, last_used_at = $2 
        WHERE credential_id = $3
      `,
      values: [this.sign_count, this.last_used_at, this.credential_id],
    }
  }
  static async findByEmployeeId(employee_id) {
      const query = {
        text: 'SELECT * FROM webauthn_credentials WHERE employee_id = $1',
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

export default CredentialModel
