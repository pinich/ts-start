export interface LoginDto {
  email: string;
  password: string;
}

export function validateLoginDto(data: any): data is LoginDto {
  return (
    typeof data === 'object' &&
    typeof data.email === 'string' &&
    typeof data.password === 'string' &&
    data.email.includes('@') &&
    data.password.length > 0
  );
}