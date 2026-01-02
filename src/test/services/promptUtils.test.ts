import { describe, it, expect } from "@jest/globals";
import { escapeTemplateContent, unescapeTemplateContent } from "~/server/services/promptUtils";

describe("promptUtils", () => {
  describe("escapeTemplateContent", () => {
    it("should escape template markers in content using HTML entities", () => {
      const input = "This is {{variable}} content";
      const result = escapeTemplateContent(input);
      expect(result).toBe("This is &#123;&#123;variable&#125;&#125; content");
    });

    it("should escape multiple template markers", () => {
      const input = "{{start}} and {{end}} markers";
      const result = escapeTemplateContent(input);
      expect(result).toBe("&#123;&#123;start&#125;&#125; and &#123;&#123;end&#125;&#125; markers");
    });

    it("should handle nested template markers", () => {
      const input = "{{outer{{inner}}outer}}";
      const result = escapeTemplateContent(input);
      expect(result).toBe("&#123;&#123;outer&#123;&#123;inner&#125;&#125;outer&#125;&#125;");
    });

    it("should not modify content without template markers", () => {
      const input = "This is normal content without any markers";
      const result = escapeTemplateContent(input);
      expect(result).toBe(input);
    });

    it("should handle empty string", () => {
      const result = escapeTemplateContent("");
      expect(result).toBe("");
    });

    it("should handle content with only opening braces", () => {
      const input = "Content with {{ only opening";
      const result = escapeTemplateContent(input);
      expect(result).toBe("Content with &#123;&#123; only opening");
    });

    it("should handle content with only closing braces", () => {
      const input = "Content with }} only closing";
      const result = escapeTemplateContent(input);
      expect(result).toBe("Content with &#125;&#125; only closing");
    });

    it("should escape template markers in multiline content", () => {
      const input = "Line 1\n{{variable}}\nLine 3";
      const result = escapeTemplateContent(input);
      expect(result).toBe("Line 1\n&#123;&#123;variable&#125;&#125;\nLine 3");
    });
  });

  describe("unescapeTemplateContent", () => {
    it("should unescape HTML entities back to template markers", () => {
      const input = "This is &#123;&#123;variable&#125;&#125; content";
      const result = unescapeTemplateContent(input);
      expect(result).toBe("This is {{variable}} content");
    });

    it("should handle multiple escaped markers", () => {
      const input = "&#123;&#123;start&#125;&#125; and &#123;&#123;end&#125;&#125;";
      const result = unescapeTemplateContent(input);
      expect(result).toBe("{{start}} and {{end}}");
    });

    it("should not modify content without HTML entities", () => {
      const input = "This is normal content";
      const result = unescapeTemplateContent(input);
      expect(result).toBe(input);
    });

    it("should round-trip correctly", () => {
      const original = "This is {{variable}} content";
      const escaped = escapeTemplateContent(original);
      const unescaped = unescapeTemplateContent(escaped);
      expect(unescaped).toBe(original);
    });
  });
});

