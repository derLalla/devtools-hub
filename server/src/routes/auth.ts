import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { User } from "../models/User";
import { signToken } from "../middleware/auth";

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many login attempts, try again later" },
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request body" });
      return;
    }
    const { username, password } = parsed.data;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      // constant-time-ish: still perform a bcrypt compare to avoid trivial timing leaks
      await bcrypt.compare(
        password,
        "$2a$12$0000000000000000000000000000000000000000000000000000",
      );
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    const token = signToken({
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    });
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});
