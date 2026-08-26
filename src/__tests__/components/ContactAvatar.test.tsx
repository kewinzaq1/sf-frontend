import { render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("ContactAvatar", () => {
  it("shows initials when the contact has no photo", () => {
    const { container } = render(<ContactAvatar contact={makeContact()} />);

    expect(container).toHaveTextContent("AL");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("shows the photo as a circular image when one is set", () => {
    render(<ContactAvatar contact={makeContact({ photo: TINY_PNG })} />);

    const image = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(image).toHaveAttribute("src", TINY_PNG);
    expect(image).toHaveClass("rounded-full", "object-cover", "aspect-square");
  });
});
