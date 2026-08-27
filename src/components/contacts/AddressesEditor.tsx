"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { ADDRESS_TYPE_LABELS, MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressInput } from "@/lib/contacts/types";

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

interface Row extends AddressInput {
  /** Stable client-side key; addresses have no id until they are saved. */
  key: number;
}

const EMPTY_ROW: AddressInput = {
  type: "home",
  street: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
};

/**
 * Editable list of typed addresses for the contact form.
 *
 * Rows live in client state and are submitted as JSON through a hidden
 * `addresses` input, keeping the form a plain POST. The server action parses
 * and validates the JSON with the same zod schema as every other field.
 */
export default function AddressesEditor({
  initialAddresses,
  error,
}: {
  initialAddresses: AddressInput[];
  error?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialAddresses.map((address, index) => ({ ...address, key: index })),
  );

  function addRow() {
    setRows((current) => [
      ...current,
      // Keys only ever grow, so a removed row's key is never reused.
      { ...EMPTY_ROW, key: current.reduce((max, row) => Math.max(max, row.key), -1) + 1 },
    ]);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function patchRow(key: number, patch: Partial<AddressInput>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const serialized = JSON.stringify(
    rows.map(({ type, street, city, state, postal_code, country }) => ({
      type,
      street,
      city,
      state,
      postal_code,
      country,
    })),
  );

  return (
    <div className="space-y-4">
      <input type="hidden" name="addresses" value={serialized} />

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[13px] text-muted-foreground">
          No addresses yet.
        </p>
      ) : (
        rows.map((row, index) => (
          <div
            key={row.key}
            className="space-y-3 rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                Type
                <select
                  value={row.type}
                  onChange={(event) =>
                    patchRow(row.key, {
                      type: event.target.value as AddressInput["type"],
                    })
                  }
                  className="h-8 rounded-md border border-border bg-input px-2 text-[13px] text-foreground"
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ADDRESS_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(row.key)}
                aria-label={`Remove address ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Remove
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AddressField
                label="Street address"
                value={row.street}
                maxLength={300}
                placeholder="1 Market St, Suite 400"
                autoComplete="street-address"
                wide
                onChange={(street) => patchRow(row.key, { street })}
              />
              <AddressField
                label="City"
                value={row.city}
                maxLength={120}
                placeholder="San Francisco"
                autoComplete="address-level2"
                onChange={(city) => patchRow(row.key, { city })}
              />
              <AddressField
                label="State / region"
                value={row.state}
                maxLength={120}
                placeholder="CA"
                autoComplete="address-level1"
                onChange={(state) => patchRow(row.key, { state })}
              />
              <AddressField
                label="Postal code"
                value={row.postal_code}
                maxLength={20}
                placeholder="94105"
                autoComplete="postal-code"
                onChange={(postal_code) => patchRow(row.key, { postal_code })}
              />
              <AddressField
                label="Country"
                value={row.country}
                maxLength={120}
                placeholder="USA"
                autoComplete="country-name"
                onChange={(country) => patchRow(row.key, { country })}
              />
            </div>
          </div>
        ))
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= MAX_ADDRESSES}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AddressField({
  label,
  value,
  maxLength,
  placeholder,
  autoComplete,
  wide,
  onChange,
}: {
  label: string;
  value: string | null;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="mb-1.5 block text-[13px] font-medium text-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value ?? ""}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      />
    </label>
  );
}
