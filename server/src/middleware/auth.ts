import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { loadConfig } from "../config";

export interface AuthPayload {
  sub: string;
  username: string;
  role: "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

export function signToken(payload: AuthPayload): string {
  const config = loadConfig();
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "missing or invalid Authorization header" });
    return;
  }
  const token = header.slice(7).trim();
  try {
    const config = loadConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "admin role required" });
    return;
  }
  next();
}
