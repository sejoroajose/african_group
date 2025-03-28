import WebAuthnService from './webauthnService.js'

class CredentialService {
  constructor(pool) {
    this.pool = pool
  }

  async createCredential(credentialData) {
    const credential = new Credential(credentialData)
    const validationErrors = credential.validate()

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '))
    }

    try {
      const result = await this.pool.query(credential.toInsertQuery())
      return result
    } catch (error) {
      console.error('Error creating credential:', error)
      throw error
    }
  }

  async findCredentialsByEmployeeId(employeeId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM webauthn_credentials WHERE employee_id = $1',
        [employeeId]
      )
      return result.rows
    } catch (error) {
      console.error('Error finding credentials:', error)
      throw error
    }
  }

  async findCredentialByCredentialId(credentialId) {
    try {
      const normalizedCredentialId =
        WebAuthnService.normalizeCredentialId(credentialId)
      const result = await this.pool.query(
        'SELECT * FROM webauthn_credentials WHERE credential_id = $1',
        [normalizedCredentialId]
      )
      return result.rows[0]
    } catch (error) {
      console.error('Error finding credential:', error)
      throw error
    }
  }

  async updateCredentialMetadata(credentialId, signCount) {
    try {
      const credential = new Credential({
        credential_id: credentialId,
        sign_count: signCount,
      })
      const updateQuery = credential.updateAuthenticationMetadata(signCount)

      const result = await this.pool.query(updateQuery)
      return result
    } catch (error) {
      console.error('Error updating credential metadata:', error)
      throw error
    }
  }

  async deleteCredential(credentialId) {
    try {
      const result = await this.pool.query(
        'DELETE FROM webauthn_credentials WHERE credential_id = $1',
        [credentialId]
      )
      return result
    } catch (error) {
      console.error('Error deleting credential:', error)
      throw error
    }
  }
}

export default CredentialService
