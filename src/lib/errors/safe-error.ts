export type SafeError = Readonly<{
  code: "UNEXPECTED" | "VALIDATION";
  message: string;
  retryable: boolean;
}>;

export const unexpectedError: SafeError = {
  code: "UNEXPECTED",
  message: "The request could not be completed.",
  retryable: true,
};
