import { expect, it, describe } from "vitest";
import { breakHTMLByHeaders } from "./scraping";

describe("breakHTMLByHeaders", () => {
  it("should break HTML content by headers", () => {
    const html =
      "<h1>Title</h1><p>Some text.</p><h2>Subtitle</h2><p>Some other text.</p>";
    const result = breakHTMLByHeaders(html);
    expect(result).toEqual([
      "<h1>Title</h1><p>Some text.</p>",
      "<h2>Subtitle</h2><p>Some other text.</p>",
    ]);
  });

  it("should handle multiple same-level headers", () => {
    const html =
      "<h1>Title</h1><p>Some text.</p><h1>Another Title</h1><p>Some other text.</p>";
    const result = breakHTMLByHeaders(html);
    expect(result).toEqual([
      "<h1>Title</h1><p>Some text.</p>",
      "<h1>Another Title</h1><p>Some other text.</p>",
    ]);
  });

  it("should handle nested headers", () => {
    const html =
      "<h1>Title</h1><p>Some text.</p><h2>Subtitle</h2><h3>Sub-subtitle</h3><p>Some other text.</p>";
    const result = breakHTMLByHeaders(html);
    expect(result).toEqual([
      "<h1>Title</h1><p>Some text.</p>",
      "<h2>Subtitle</h2>",
      "<h3>Sub-subtitle</h3><p>Some other text.</p>",
    ]);
  });
});

it("should handle complex HTML structures", () => {
  const html =
    "<h1>Title</h1><p>Some text.</p><h2>Subtitle</h2><h3>Sub-subtitle</h3><p>Some other text.</p><h1>Another Title</h1><p>More text.</p><h2>Another Subtitle</h2><p>Even more text.</p>";
  const result = breakHTMLByHeaders(html);
  expect(result).toEqual([
    "<h1>Title</h1><p>Some text.</p>",
    "<h2>Subtitle</h2>",
    "<h3>Sub-subtitle</h3><p>Some other text.</p>",
    "<h1>Another Title</h1><p>More text.</p>",
    "<h2>Another Subtitle</h2><p>Even more text.</p>",
  ]);
});
