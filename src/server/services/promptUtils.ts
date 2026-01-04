/**
 * Prompt Utilities
 * Helper functions for safe prompt template handling
 */

/**
 * Escape template markers in user content to prevent prompt injection
 * Replaces {{ and }} with escaped versions that won't be interpreted as template variables
 * 
 * @param content User-provided content that may contain template markers
 * @returns Escaped content safe for template replacement
 */
export function escapeTemplateContent(content: string | null | undefined): string {
  // Handle null/undefined
  if (!content) {
    return "";
  }
  // Replace {{ with a safe alternative that won't be interpreted
  // Using a placeholder that's unlikely to appear in user content
  return content
    .replace(/\{\{/g, "&#123;&#123;") // HTML entity for {{
    .replace(/\}\}/g, "&#125;&#125;"); // HTML entity for }}
}

/**
 * Unescape template content (for display purposes if needed)
 * 
 * @param content Escaped content
 * @returns Unescaped content
 */
export function unescapeTemplateContent(content: string): string {
  return content
    .replace(/&#123;&#123;/g, "{{")
    .replace(/&#125;&#125;/g, "}}");
}

