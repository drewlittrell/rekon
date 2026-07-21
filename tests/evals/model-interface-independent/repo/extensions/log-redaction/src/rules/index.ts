import { redactApiKey } from "./api-key.ts";
import { redactEmail } from "./email.ts";

export type RedactionRule = (value: string) => string;

export const redactionRules: RedactionRule[] = [redactEmail, redactApiKey];
