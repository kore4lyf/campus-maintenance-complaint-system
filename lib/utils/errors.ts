class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes("fetch")) {
      return "A network error occurred. Please check your connection and try again.";
    }
    if (error.message.includes("timeout")) {
      return "The request took too long. Please try again.";
    }
  }
  return "Something went wrong. Please try again later.";
}

export { ApiError, toUserMessage };
