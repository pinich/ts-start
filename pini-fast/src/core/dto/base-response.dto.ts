export interface BaseResponseDto<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponseDto<T = any> extends BaseResponseDto<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class SuccessResponse<T = any> implements BaseResponseDto<T> {
  success = true;
  
  constructor(
    public data: T,
    public message?: string,
    public statusCode: number = 200
  ) {}
}

export class ErrorResponse implements BaseResponseDto {
  success = false;
  
  constructor(
    public error: string,
    public statusCode: number = 500,
    public message?: string
  ) {}
}