/** The designs of the evening payments message sent as text (built in services/paymentsMessage). Kept apart so settings can name them without loading the builder. */
export const PAYMENT_TEXT_IDS = ["receipt", "ledger", "grouped", "executive", "dashboard", "brief"] as const;
export type PaymentTextId = (typeof PAYMENT_TEXT_IDS)[number];
export const isPaymentTextId = (v: unknown): v is PaymentTextId => (PAYMENT_TEXT_IDS as readonly string[]).includes(String(v));
