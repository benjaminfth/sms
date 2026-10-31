import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Role } from "@sms/shared";

export interface AuthTokenPayload {
  userId: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "brightloop-hackathon-access-secret-32-chars-long";
const JWT_ISSUER = process.env.JWT_ISSUER || "brightloop.sms";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "brightloop.app";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";

export function generateAccessToken(payload: {
  userId: string;
  role: Role;
  email: string;
}): string {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    },
    JWT_ACCESS_SECRET,
    {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as AuthTokenPayload;
}

export function generateOpaqueToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashOpaqueToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
