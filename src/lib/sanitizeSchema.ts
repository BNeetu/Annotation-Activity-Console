import { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeOptions } from "rehype-sanitize";

/**
 * Sanitize schema for the streamed AI summary.
 *
 * The rendering pipeline is: remark-gfm (markdown) -> rehype-raw (parse any
 * raw HTML embedded in the markdown into the AST, e.g. the mock server's
 * `<img onerror=...>` / `<script>` payload) -> rehype-sanitize (strip
 * anything not on this allowlist) -> react-markdown's React renderer.
 *
 * Why rehype-raw at all: without it, react-markdown treats embedded HTML as
 * plain text (escaped), which is "safe" but also means we're not actually
 * demonstrating sanitization of markup -- and a lot of real markdown (like
 * this feed) intentionally mixes in HTML for things like <br> or <details>.
 * So we parse it, then sanitize the *parsed tree*, which is the safe way to
 * allow some HTML without allowing all of it.
 *
 * What this schema does, starting from rehype-sanitize's default (safe)
 * schema:
 *  - Drops `script`, `style`, and iframes entirely (not on the tag
 *    allowlist -> stripped along with their contents).
 *  - Strips every `on*` event handler attribute (onerror, onclick, ...) via
 *    the attribute filter below, so `<img src=x onerror="...">` renders as a
 *    plain broken image with no handler attached.
 *  - Strips `javascript:`/`data:` URLs from href/src (default schema already
 *    restricts protocols; we keep that).
 *  - Allows the tags actual markdown content needs: headings, lists,
 *    emphasis/strong, code/pre (for the ```ts block), links, images, tables.
 */
export const summarySanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "del"],
  attributes: {
    ...defaultSchema.attributes,
    // Explicitly re-affirm img is limited to src/alt/title -- no event
    // handlers, no `srcset` tricks, matching the default schema's intent.
    img: ["src", "alt", "title"],
    a: ["href", "title"],
    code: [["className", /^language-/]],
  },
  // Belt-and-suspenders: default schema already excludes on* handlers via
  // its attribute allowlist (anything not listed is dropped), so there is no
  // separate "clean handler" step needed -- omission from `attributes` IS
  // the removal mechanism in rehype-sanitize.
};
