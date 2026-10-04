// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getErrorMessage(error: any, fallback = 'Ocurrió un error inesperado') {
  return error?.response?.data?.error?.message || error?.message || fallback;
}
