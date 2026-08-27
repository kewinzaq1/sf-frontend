import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressesEditor from "@/components/contacts/AddressesEditor";
import type { AddressInput } from "@/lib/contacts/types";

function serialized(container: HTMLElement): AddressInput[] {
  const input = container.querySelector<HTMLInputElement>('input[name="addresses"]')!;
  return JSON.parse(input.value);
}

const HOME: AddressInput = {
  type: "home",
  street: null,
  city: "San Francisco",
  state: "CA",
  postal_code: null,
  country: "USA",
};

describe("AddressesEditor", () => {
  it("shows an empty state and serialises an empty list", () => {
    const { container } = render(<AddressesEditor initialAddresses={[]} />);

    expect(screen.getByText("No addresses yet.")).toBeInTheDocument();
    expect(serialized(container)).toEqual([]);
  });

  it("adds a new address with sensible defaults", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddressesEditor initialAddresses={[]} />);

    await user.click(screen.getByRole("button", { name: /add address/i }));
    await user.type(screen.getByLabelText("City"), "London");

    expect(serialized(container)).toEqual([
      { ...HOME, type: "home", city: "London", country: null, state: null },
    ]);
  });

  it("changes an address type through the select", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddressesEditor initialAddresses={[HOME]} />);

    await user.selectOptions(screen.getByLabelText(/type/i), "work");

    expect(serialized(container)[0].type).toBe("work");
  });

  it("removes an address", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AddressesEditor initialAddresses={[HOME, { ...HOME, type: "work" }]} />,
    );

    await user.click(screen.getByRole("button", { name: "Remove address 1" }));

    const remaining = serialized(container);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].type).toBe("work");
  });
});
