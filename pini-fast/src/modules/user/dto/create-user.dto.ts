export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export function validateCreateUserDto(data: any): data is CreateUserDto {
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