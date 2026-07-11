import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listAvailable, listConnected, connect, disconnect, updateSettings } from "./repo.controller.js";

const connectSchema = z.object({
  fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/, "must be in owner/repo format"),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "must be numeric"),
});

// Matches the VARCHAR(512) columns for install_command/build_command.
const MAX_COMMAND_LENGTH = 512;
// Matches the VARCHAR(255) column for output_dir.
const MAX_OUTPUT_DIR_LENGTH = 255;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

// Undefined ("field omitted") means "leave unchanged"; null/empty string means
// "clear it" (falls back to auto-detect in entrypoint.sh). The two must stay
// distinguishable through the transform for PATCH's partial-update semantics.
function nullableTrimmedString(maxLen: number) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((value) => value === undefined || value === null || value.length <= maxLen, {
      message: `must be ${maxLen} characters or fewer`,
    })
    .refine((value) => value === undefined || value === null || !CONTROL_CHARS.test(value), {
      message: "must not contain control characters",
    });
}

// output_dir is passed through quoted (not eval'd) in entrypoint.sh, but a
// malicious value here could still point `cp -r` at ".." or ".git" (which
// holds the plaintext GitHub token in .git/config) and have it published as
// the public deployment output. Reject absolute paths and those segments.
function isSafeRelativePath(value: string): boolean {
  if (value.startsWith("/")) return false;
  return value.split("/").every((segment) => segment !== ".." && segment !== ".git");
}

const updateSettingsSchema = z.object({
  installCommand: nullableTrimmedString(MAX_COMMAND_LENGTH),
  buildCommand: nullableTrimmedString(MAX_COMMAND_LENGTH),
  outputDir: nullableTrimmedString(MAX_OUTPUT_DIR_LENGTH).refine(
    (value) => value === undefined || value === null || isSafeRelativePath(value),
    { message: "must be a relative path without '..' or '.git' segments" },
  ),
});

export const repoRouter = Router();

repoRouter.use(requireAuth);

repoRouter.get("/github", listAvailable);
repoRouter.get("/", listConnected);
repoRouter.post("/", validate(connectSchema), connect);
repoRouter.patch("/:id", validate(idParamSchema, "params"), validate(updateSettingsSchema), updateSettings);
repoRouter.delete("/:id", validate(idParamSchema, "params"), disconnect);
