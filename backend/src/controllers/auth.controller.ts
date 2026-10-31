import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { AppResponse } from "../utils/response";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      AppResponse.created(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const { email, password } = req.body;

      const { accessToken, rawRefreshToken, user } = await AuthService.login(
        email,
        password,
        ip,
        userAgent
      );

      res.cookie("refreshToken", rawRefreshToken, COOKIE_OPTIONS);

      AppResponse.success(res, {
        accessToken,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const { accessToken, rawRefreshToken: newRawRefreshToken, user } =
        await AuthService.refreshToken(rawRefreshToken);

      res.cookie("refreshToken", newRawRefreshToken, COOKIE_OPTIONS);

      AppResponse.success(res, {
        accessToken,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(rawRefreshToken);

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/api/v1/auth",
      });

      AppResponse.success(res, { message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(
        req.body.token,
        req.body.newPassword
      );
      AppResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
