import { isAnimatedWebP } from "@/lib/contacts/image";

function fileOf(bytes: string, type: string): File {
  return new File([new TextEncoder().encode(bytes)], "pic", { type });
}

describe("isAnimatedWebP", () => {
  it("detects the ANIM chunk of an animated WebP", async () => {
    const animated = fileOf("RIFF____WEBPVP8X__________ANIM____", "image/webp");
    await expect(isAnimatedWebP(animated)).resolves.toBe(true);
  });

  it("treats a still WebP as not animated", async () => {
    const still = fileOf("RIFF____WEBPVP8 __________________", "image/webp");
    await expect(isAnimatedWebP(still)).resolves.toBe(false);
  });

  it("ignores non-WebP files without reading them", async () => {
    const png = fileOf("ANIM", "image/png");
    await expect(isAnimatedWebP(png)).resolves.toBe(false);
  });
});
