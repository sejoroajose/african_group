import { v4 as uuidv4 } from 'uuid'

class WorkSite {
  constructor({
    id = uuidv4(),
    name,
    address,
    latitude,
    longitude,
    project_name,
    client_name,
    active = true,
    start_date,
    expected_end_date,
    description = '',
    created_at = new Date(),
    updated_at = new Date(),
  }) {
    this.id = id
    this.name = name
    this.address = address
    this.latitude = latitude
    this.longitude = longitude
    this.project_name = project_name
    this.client_name = client_name
    this.active = active
    this.start_date = start_date
    this.expected_end_date = expected_end_date
    this.description = description
    this.created_at = created_at
    this.updated_at = updated_at
  }

  toInsertQuery() {
    return {
      text: `
        INSERT INTO work_sites (
          id, 
          name, 
          address, 
          latitude, 
          longitude, 
          project_name, 
          client_name, 
          active, 
          start_date, 
          expected_end_date, 
          description, 
          created_at, 
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          project_name = EXCLUDED.project_name,
          client_name = EXCLUDED.client_name,
          active = EXCLUDED.active,
          expected_end_date = EXCLUDED.expected_end_date,
          description = EXCLUDED.description,
          updated_at = EXCLUDED.updated_at
      `,
      values: [
        this.id,
        this.name,
        this.address,
        this.latitude,
        this.longitude,
        this.project_name,
        this.client_name,
        this.active,
        this.start_date,
        this.expected_end_date,
        this.description,
        this.created_at,
        this.updated_at,
      ],
    }
  }

  validate() {
    const errors = []
    if (!this.name) {
      errors.push('Site name is required')
    }
    if (!this.address) {
      errors.push('Site address is required')
    }
    if (!this.latitude || !this.longitude) {
      errors.push('Latitude and longitude are required')
    }
    if (!this.project_name) {
      errors.push('Project name is required')
    }
    return errors
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c 
    return distance
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  isWithinRadius(userLat, userLon, radiusKm = 0.1) {
    const distance = WorkSite.calculateDistance(
      this.latitude,
      this.longitude,
      userLat,
      userLon
    )
    return distance <= radiusKm
  }
}

export default WorkSite
