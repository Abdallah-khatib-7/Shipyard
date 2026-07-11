import stripAnsi from "strip-ansi";

// npm's progress spinner draws each frame with CSI "Cursor Horizontal Absolute"
// (e.g. ESC[1G) to rewind to column 1, then CSI "Erase in Line" (ESC[0K) to
// clear the stale frame, instead of a plain carriage return. stripAnsi deletes
// both outright, which would concatenate every frame into one run of garbled
// text - so CHA is normalized to \r first, giving it the same "restart this
// line" meaning a real terminal would apply before the later collapse step.
const CURSOR_TO_LINE_START = /\x1b\[\d*G/g;

function collapseOverwrites(line: string): string {
  const lastCr = line.lastIndexOf("\r");
  return lastCr === -1 ? line : line.slice(lastCr + 1);
}

function stripEscapes(text: string): string {
  return stripAnsi(text.replace(CURSOR_TO_LINE_START, "\r"));
}

// text always ends with a real "\n" here (see push()), so any \r immediately
// before it is a genuine CRLF line ending rather than a mid-line overwrite.
function clean(text: string): string {
  const normalized = stripEscapes(text).replace(/\r\n/g, "\n");
  return normalized.split("\n").map(collapseOverwrites).join("\n");
}

/**
 * Cleans raw container stdout/stderr for storage/streaming: strips ANSI escape
 * sequences and collapses carriage-return-driven spinner/progress-bar redraws
 * down to the final state of each line, so overwritten frames don't show up as
 * repeated garbage lines. Chunks arrive at arbitrary byte boundaries, so an
 * incomplete trailing line is buffered until a later push() or flush()
 * completes it.
 */
export function createLogSanitizer() {
  let pending = "";

  function push(chunk: string): string {
    const raw = pending + chunk;
    const lastNewline = raw.lastIndexOf("\n");
    if (lastNewline === -1) {
      pending = raw;
      return "";
    }
    pending = raw.slice(lastNewline + 1);
    return clean(raw.slice(0, lastNewline + 1));
  }

  function flush(): string {
    if (!pending) return "";
    // pending never contains a real "\n" (see push()), so any \r in it is
    // always a mid-line overwrite, never half of a CRLF pair - collapse
    // directly rather than reusing clean()'s CRLF-normalization step.
    const cleaned = collapseOverwrites(stripEscapes(pending));
    pending = "";
    return cleaned;
  }

  return { push, flush };
}
