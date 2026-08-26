import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoInput from "@/components/contacts/PhotoInput";
import { PHOTO_MAX_BYTES } from "@/lib/contacts/schema";

function hiddenPhotoInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[name="photo"]')!;
}

describe("PhotoInput", () => {
  it("reads a chosen image into the hidden photo field and previews it", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    const file = new File(["fake-png-bytes"], "ada.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Choose a profile photo"), file);

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toMatch(/^data:image\/png;base64,/),
    );
    expect(screen.getByAltText("Profile photo preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change photo/i })).toBeInTheDocument();
  });

  it("rejects a file over 1 MB without touching the staged photo", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhotoInput />);

    const oversized = new File(
      [new Uint8Array(PHOTO_MAX_BYTES + 1)],
      "huge.png",
      { type: "image/png" },
    );
    await user.upload(screen.getByLabelText("Choose a profile photo"), oversized);

    expect(await screen.findByRole("alert")).toHaveTextContent("over 1 MB");
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

  it("keeps an existing photo staged and can remove it", async () => {
    const user = userEvent.setup();
    const initial = "data:image/png;base64,QQ==";
    const { container } = render(<PhotoInput initialPhoto={initial} />);

    expect(hiddenPhotoInput(container).value).toBe(initial);

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(hiddenPhotoInput(container).value).toBe("");
  });
});
