import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "params" | "query";

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({ error: "Validation failed", details: result.error.issues });
      return;
    }
    req[source] = result.data;
    next();
  };
}
