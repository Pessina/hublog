import { describe, expect, it } from "vitest";
import { getFirstImgSrc } from "./utils";

describe("getFirstImgSrc", () => {
  it("should return the src of the first image tag in the html string", () => {
    const html = '<div><img src="test1.jpg"></div><img src="test2.jpg">';
    expect(getFirstImgSrc(html)).toBe("test1.jpg");
  });

  it("should return an empty string if there are no image tags", () => {
    const html = "<div>No image tags here</div>";
    expect(getFirstImgSrc(html)).toBe("");
  });

  it("should return an empty string if the image tag has no src attribute", () => {
    const html = "<div><img></div>";
    expect(getFirstImgSrc(html)).toBe("");
  });

  it("should return the src of the first image tag even if it is nested deeply", () => {
    const html = '<div><div><div><img src="nested.jpg"></div></div></div>';
    expect(getFirstImgSrc(html)).toBe("nested.jpg");
  });

  it("should ignore any src attributes not within an image tag", () => {
    const html = '<div src="notAnImage.jpg"><img src="test.jpg"></div>';
    expect(getFirstImgSrc(html)).toBe("test.jpg");
  });

  it("should return the src of the first image tag when multiple image tags are present", () => {
    const html =
      '<div><img src="test1.jpg"></div><img src="test2.jpg"><img src="test3.jpg">';
    expect(getFirstImgSrc(html)).toBe("test1.jpg");
  });

  it("should return the src of the first image tag even if it is nested within multiple divs and spans", () => {
    const html = '<div><span><div><img src="nested.jpg"></div></span></div>';
    expect(getFirstImgSrc(html)).toBe("nested.jpg");
  });

  it("should return an empty string if the image tag is present but the src attribute is missing", () => {
    const html = "<div><img></div>";
    expect(getFirstImgSrc(html)).toBe("");
  });

  it("should return the src of the first image tag even if it is nested within other tags with src attributes", () => {
    const html =
      '<div src="notAnImage.jpg"><span src="alsoNotAnImage.jpg"><img src="test.jpg"></span></div>';
    expect(getFirstImgSrc(html)).toBe("test.jpg");
  });
});
