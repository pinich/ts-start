export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  isActive?: boolean;
}

export function validateUpdateUserDto(data: any): data is UpdateUserDto {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // At least one field should be provided for update
  const hasValidField = (
    (data.email === undefined || (typeof data.email === 'string' && data.email.includes('@'))) &&
    (data.username === undefined || (typeof data.username === 'string' && data.username.length >= 3)) &&
    (data.firstName === undefined || typeof data.firstName === 'string') &&
    (data.lastName === undefined || typeof data.lastName === 'string') &&
    (data.password === undefined || (typeof data.password === 'string' && data.password.length >= 6)) &&
    (data.isActive === undefined || typeof data.isActive === 'boolean')
  );

  return hasValidField && Object.keys(data).length > 0;
}