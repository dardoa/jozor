export const MAX_JSON_BODY_SIZE = 5 * 1024 * 1024; // 5MB

export class PayloadTooLargeError extends Error {
  constructor(message = 'Payload Too Large') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}
