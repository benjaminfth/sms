import { Response } from "express";
import { serializeBigInts } from "@sms/shared";

export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export class AppResponse {
  static success<T>(res: Response, data: T, statusCode = 200) {
    const serializedData = serializeBigInts(data);
    return res.status(statusCode).json({
      success: true,
      data: serializedData,
      meta: null,
      error: null,
    });
  }

  static created<T>(res: Response, data: T) {
    return AppResponse.success(res, data, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationParams,
    statusCode = 200
  ) {
    const totalPages = Math.ceil(pagination.total / (pagination.pageSize || 1)) || 1;
    const serializedData = serializeBigInts(data);

    return res.status(statusCode).json({
      success: true,
      data: serializedData,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages,
      },
      error: null,
    });
  }

  static error(
    res: Response,
    code: string,
    message: string,
    details: unknown = [],
    statusCode = 400
  ) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code,
        message,
        details: serializeBigInts(details),
      },
    });
  }
}
