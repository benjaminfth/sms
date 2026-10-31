import { Request, Response, NextFunction } from "express";
import { Role } from "@sms/shared";
import { verifyAccessToken } from "../utils/token";
import { UnauthorizedError } from "../utils/errors";
import { prisma } from "../database/prisma";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Bearer token not found");
    }

    const payload = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        customer: {
          select: { id: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User session is inactive or invalid");
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as unknown as Role,
      customerId: user.customer?.id,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      next(new UnauthorizedError("Access token has expired"));
    } else if (err.name === "JsonWebTokenError") {
      next(new UnauthorizedError("Invalid access token"));
    } else {
      next(err);
    }
  }
}
