export type ResponseEnvelope<T> = {
  success: boolean;
  code: number;
  message: string;
  data?: T | null;
};
