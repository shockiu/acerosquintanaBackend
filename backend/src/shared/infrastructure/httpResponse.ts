export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
}

export const success = <T>(data: T): ApiResponse<T> => ({
  ok: true,
  data,
});

export const fail = (message: string, details?: any): ApiResponse<never> => ({
  ok: false,
  error: {
    message,
    details,
  },
});
