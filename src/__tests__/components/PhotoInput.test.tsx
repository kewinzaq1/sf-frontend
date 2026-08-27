import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoInput from "@/components/contacts/PhotoInput";
import { compressAvatar, MAX_INPUT_BYTES } from "@/lib/contacts/image";
import { PHOTO_MAX_BYTES } from "@/lib/contacts/schema";

// jsdom has no createImageBitmap/canvas encoding, so the compressor is mocked;
// its own behaviour is exercised in the browser, not here.
jest.mock("@/lib/contacts/image", () => ({
  ...jest.requireActual("@/lib/contacts/image"),
  compressAvatar: jest.fn(),
}));

const compressAvatarMock = compressAvatar as jest.MockedFunction<
  typeof compressAvatar
>;

const COMPRESSED = "data:image/webp;base64,QUJD";

function hiddenPhotoInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[name="photo"]')!;
}

function pngOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" });
}

beforeEach(() => {
  compressAvatarMock.mockReset().mockResolvedValue(COMPRESSED);
});

describe("PhotoInput", () => {
  it("compresses a chosen image into the hidden photo field and previews it", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    await user.upload(screen.getByLabelText("Choose a profile photo"), pngOfSize(100));

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toBe(COMPRESSED),
    );
    expect(compressAvatarMock).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText("Profile photo preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change photo/i })).toBeInTheDocument();
  });

  it("accepts a photo far over the API cap, because compression shrinks it", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    await user.upload(
      screen.getByLabelText("Choose a profile photo"),
      pngOfSize(PHOTO_MAX_BYTES * 5),
    );

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toBe(COMPRESSED),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a file over the 25 MB decode guard without compressing", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    await user.upload(
      screen.getByLabelText("Choose a profile photo"),
      pngOfSize(MAX_INPUT_BYTES + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("over 25 MB");
    expect(compressAvatarMock).not.toHaveBeenCalled();
    expect(hiddenPhotoInput(container).value).toBe("");
  });

  it("rejects a non-image file", async () => {
    // Bypass the `accept` filter, as a user dragging in the wrong file would.
    const user = userEvent.setup({ applyAccept: false });
    render(<PhotoInput />);

    const pdf = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Choose a profile photo"), pdf);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PNG, JPEG, WebP, or GIF",
    );
  });

  it("keeps a small GIF verbatim so its animation survives", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    const gif = new File(["GIF89a-bytes"], "party.gif", { type: "image/gif" });
    await user.upload(screen.getByLabelText("Choose a profile photo"), gif);

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toMatch(/^data:image\/gif;base64,/),
    );
    expect(compressAvatarMock).not.toHaveBeenCalled();
  });

  it("keeps a small animated WebP verbatim so its animation survives", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    const animated = new File(
      [new TextEncoder().encode("RIFF____WEBPVP8X__________ANIM____")],
      "party.webp",
      { type: "image/webp" },
    );
    await user.upload(screen.getByLabelText("Choose a profile photo"), animated);

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toMatch(/^data:image\/webp;base64,/),
    );
    expect(compressAvatarMock).not.toHaveBeenCalled();
  });

  it("still compresses a still WebP", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    const still = new File(
      [new TextEncoder().encode("RIFF____WEBPVP8 ____________")],
      "pic.webp",
      { type: "image/webp" },
    );
    await user.upload(screen.getByLabelText("Choose a profile photo"), still);

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toBe(COMPRESSED),
    );
    expect(compressAvatarMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a GIF over the API cap, since GIFs skip compression", async () => {
    const user = userEvent.setup();
    render(<PhotoInput />);

    const gif = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "party.gif", {
      type: "image/gif",
    });
    await user.upload(screen.getByLabelText("Choose a profile photo"), gif);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1 MB or smaller",
    );
  });

  it("falls back to the original file when compression fails and it fits", async () => {
    compressAvatarMock.mockRejectedValue(new Error("no canvas"));
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    await user.upload(screen.getByLabelText("Choose a profile photo"), pngOfSize(100));

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toMatch(/^data:image\/png;base64,/),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("errors when compression fails and the original is over the cap", async () => {
    compressAvatarMock.mockRejectedValue(new Error("no canvas"));
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    await user.upload(
      screen.getByLabelText("Choose a profile photo"),
      pngOfSize(PHOTO_MAX_BYTES + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be processed",
    );
    expect(hiddenPhotoInput(container).value).toBe("");
  });

  it("keeps an existing photo staged and can remove it", async () => {
    const user = userEvent.setup();
    const initial = "data:image/png;base64,QQ==";
    const { container } = render(<PhotoInput initialPhoto={initial} />);

    expect(hiddenPhotoInput(container).value).toBe(initial);

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(hiddenPhotoInput(container).value).toBe("");
  });
});
