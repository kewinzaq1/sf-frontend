"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/contacts/schema";

/**
 * Photo picker for the contact form.
 *
 * The chosen image is read into a base64 data URL and submitted through a
 * hidden `photo` input, so the form stays a plain POST. Because the input is
 * always present, an untouched edit form re-submits the existing photo —
 * important, since saving is a full `PUT` replacement.
 */
export default function PhotoInput({
  initialPhoto,
  error,
}: {
  initialPhoto?: string | null;
  error?: string;
}) {
  const [photo, setPhoto] = useState(initialPhoto ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (!file) return;

    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setLocalError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setLocalError("That image is over 1 MB. Pick a smaller one.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setLocalError(null);
    };
    reader.onerror = () => setLocalError("That file could not be read.");
    reader.readAsDataURL(file);
  }

  const message = localError ?? error;

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="photo" value={photo} />
      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_MIME_TYPES.join(",")}
        onChange={onFileChange}
        className="sr-only"
        aria-label="Choose a profile photo"
      />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL; next/image adds nothing here
        <img
          src={photo}
          alt="Profile photo preview"
          className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/60"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
        </span>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {photo ? "Change photo" : "Upload photo"}
          </Button>
          {photo ? (
            <Button variant="ghost" size="sm" onClick={() => setPhoto("")}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
        {message ? (
          <p role="alert" className="text-[13px] text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
