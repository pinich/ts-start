export interface RegisterDto {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export function validateRegisterDto(data: any): data is RegisterDto {
  return (
    typeof data === 'object' &&
    typeof data.email === 'string' &&
    typeof data.username === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.password === 'string' &&
    data.email.includes('@') &&
    data.username.length >= 3 &&
    data.password.length >= 6
  );
}