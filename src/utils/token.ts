import crypto from "crypto";
export const generateToken = (bytes: number = 32) => crypto.randomBytes(bytes).toString("hex");
export const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);