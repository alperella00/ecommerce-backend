import jwt from "jsonwebtoken";

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || "dev-secret";

export const signJwt = (
  payload: string | object | Buffer,
  expiresIn: jwt.SignOptions["expiresIn"] = "7d"
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

export const verifyJwt = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: "admin" | "customer" };
};