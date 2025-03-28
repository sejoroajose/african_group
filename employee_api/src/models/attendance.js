import { v4 as uuidv4 } from 'uuid'

class Attendance {
  constructor({
    id = uuidv4(),
    employee_id,
    name,
    type, 
    timestamp = new Date(),
    location_type, 
    site_id = null,
    latitude,
    longitude,
    address,
    notes = '',
    created_at = new Date(),
  }) {
    this.id = id
    this.employee_id = employee_id
    this.name = name
    this.type = type
    this.timestamp = timestamp
    this.location_type = location_type
    this.site_id = site_id
    this.latitude = latitude
    this.longitude = longitude
    this.address = address
    this.notes = notes
    this.created_at = created_at
  }

  toInsertQuery() {
    return {
      text: `
        INSERT INTO attendance_records (
          id, 
          employee_id, 
          name, 
          type, 
          timestamp, 
          location_type, 
          site_id, 
          latitude, 
          longitude, 
          address, 
          notes, 
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
      `,
      values: [
        this.id,
        this.employee_id,
        this.name,
        this.type,
        this.timestamp,
        this.location_type,
        this.site_id,
        this.latitude,
        this.longitude,
        this.address,
        this.notes,
        this.created_at,
      ],
    }
  }

  validate() {
    const errors = []
    if (!this.employee_id) {
      errors.push('Employee ID is required')
    }
    if (!['sign-in', 'sign-out'].includes(this.type)) {
      errors.push('Invalid attendance type')
    }
    if (!['office', 'site', 'remote'].includes(this.location_type)) {
      errors.push('Invalid location type')
    }


    if (this.location_type === 'office') {
      if (!this.latitude || !this.longitude) {
        errors.push('Latitude and longitude are required for office attendance')
      }
    }

    if (['site', 'office'].includes(this.location_type)) {
      if (!this.latitude || !this.longitude) {
        errors.push(
          'Latitude and longitude are required for site and office locations'
        )
      }
    }

    return errors
  }

  static fromRequest(data) {
    return new Attendance({
      employee_id: data.employee_id,
      name: data.name,
      type: data.type,
      location_type: data.location_type,
      site_id: data.site_id,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      notes: data.notes,
    })
  }
}

export default Attendance
