"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Sparkles, CircleCheck, ImageOff } from "lucide-react";
import { useSummaryStream } from "@/hooks/useSummaryStream";
import { summarySanitizeSchema } from "@/lib/sanitizeSchema";

/** react-markdown's custom renderer for <img>. The mock summary content
 * deliberately includes an image with an unloadable src (originally paired
 * with an onerror handler, to test that rehype-sanitize strips it -- see
 * the safety note below) so the browser's default broken-image icon would
 * otherwise show up in the middle of the summary. This swaps that for a
 * small, deliberate placeholder instead of hiding it entirely, since a
 * silently vanishing image is more confusing than an explained one. */
function MarkdownImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="not-prose my-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
        <ImageOff className="h-3.5 w-3.5" strokeWidth={1.75} />
        Image unavailable{props.alt ? ` — ${props.alt}` : ""}
      </span>
    );
  }
  // eslint-disable-next-line jsx-a11y/alt-text -- alt comes through via ...props
  return <img {...props} onError={() => setFailed(true)} className="rounded-lg" />;
}

/**
 * Renders the AI-generated task summary as it streams in.
 *
 * Safety: the raw text is untrusted (per the brief it deliberately includes
 * an `<img onerror>` and a `<script>` tag). We never use `dangerouslySetInnerHTML`
 * anywhere in this component. Instead, react-markdown parses the text into a
 * markdown AST and renders it through React elements; `rehype-raw` lets
 * embedded HTML *join that AST* (rather than being dropped as text), and
 * `rehype-sanitize` (with the allowlist in lib/sanitizeSchema.ts) strips
 * anything not on the allowlist -- `<script>` is removed outright, and
 * `onerror`/`onclick`/etc. attributes are removed from any tag that *is*
 * allowed (e.g. `<img>`) -- before React ever renders a single node. So the
 * `<script>alert(...)</script>` never executes and the original `onerror`
 * handler in the source text never attaches; only inert markup reaches the
 * DOM. The `onError` on `MarkdownImage` above is *our own* handler, added
 * after sanitization, purely for a nicer fallback -- not a re-introduction
 * of the stripped one.
 */
export function SummaryMarkdown({ taskId }: { taskId: string | null }) {
  const { text, status, error } = useSummaryStream(taskId);

  if (!taskId) {
    return <p className="p-6 text-sm text-slate-400">Select a task to see its AI summary.</p>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2 text-xs">
        {status === "streaming" && (
          <span className="inline-flex items-center gap-1.5 font-medium text-navy-600">
            <Sparkles className="h-3 w-3 animate-pulse" strokeWidth={1.75} />
            Generating summary…
          </span>
        )}
        {status === "done" && (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <CircleCheck className="h-3 w-3" strokeWidth={1.75} />
            Summary complete
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">{error}</span>
        )}
      </div>

      <div className="prose prose-sm max-w-none prose-headings:font-medium prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-800 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-700 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, summarySanitizeSchema]]}
          components={{ img: MarkdownImage }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
