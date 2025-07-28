export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roles?: string[]; // Optional roles, requires admin privileges to assign
}

export function validateRegisterDto(data: any): data is RegisterDto {
  return (
    typeof data === 'object' &&
    typeof data.email === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.password === 'string' &&
    data.email.includes('@') &&
    data.password.length >= 6 &&
    (data.roles === undefined || (Array.isArray(data.roles) && data.roles.every((role: any) => typeof role === 'string')))
  );
}