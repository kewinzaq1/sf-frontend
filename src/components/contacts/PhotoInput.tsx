"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { compressAvatar, isAnimatedWebP, MAX_INPUT_BYTES } from "@/lib/contacts/image";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/contacts/schema";

/**
 * Photo picker for the contact form.
 *
 * The chosen image is compressed to a tiny square avatar, read into a base64
 * data URL, and submitted through a hidden `photo` input, so the form stays a
 * plain POST. Because the input is always present, an untouched edit form
 * re-submits the existing photo — important, since saving is a full `PUT`
 * replacement.
 *
 * Reads are serialised: picking another file or removing the photo cancels
 * any in-flight read or compression via a job id, and `onReadStateChange`
 * lets the form block submission until the staged value is current.
 */
export default function PhotoInput({
  initialPhoto,
  error,
  onReadStateChange,
}: {
  initialPhoto?: string | null;
  error?: string;
  onReadStateChange?: (isReading: boolean) => void;
}) {
  const [photo, setPhoto] = useState(initialPhoto ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const jobIdRef = useRef(0);

  function cancelPendingJob() {
    jobIdRef.current += 1;
    readerRef.current?.abort();
    readerRef.current = null;
    onReadStateChange?.(false);
  }

  useEffect(() => () => readerRef.current?.abort(), []);

  function stagePhoto(dataUrl: string) {
    setPhoto(dataUrl);
    setLocalError(null);
  }

  function finishJob(jobId: number): boolean {
    if (jobIdRef.current !== jobId) return false; // superseded by a newer pick
    readerRef.current = null;
    onReadStateChange?.(false);
    return true;
  }

  function readVerbatim(file: File, jobId: number) {
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (finishJob(jobId)) stagePhoto(String(reader.result));
    };
    reader.onerror = () => {
      if (finishJob(jobId)) setLocalError("That file could not be read.");
    };
    reader.readAsDataURL(file);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    cancelPendingJob();
    if (!file) return;

    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setLocalError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setLocalError("That file is over 25 MB. Pick a smaller one.");
      return;
    }
    const jobId = jobIdRef.current;

    // Re-encoding through a canvas would freeze animation, so GIFs and
    // animated WebPs are kept verbatim and stay bound by the API's 1 MB cap.
    const keepVerbatim =
      file.type === "image/gif" || (await isAnimatedWebP(file));
    if (jobIdRef.current !== jobId) return; // superseded while sniffing
    if (keepVerbatim && file.size > PHOTO_MAX_BYTES) {
      setLocalError("Animated images are kept as-is, so they must be 1 MB or smaller.");
      return;
    }

    onReadStateChange?.(true);

    if (keepVerbatim) {
      readVerbatim(file, jobId);
      return;
    }

    try {
      const compressed = await compressAvatar(file);
      if (finishJob(jobId)) stagePhoto(compressed);
    } catch {
      if (jobIdRef.current !== jobId) return;
      // Compression needs canvas APIs; if they fail, the original still works
      // as long as it fits the API's cap.
      if (file.size <= PHOTO_MAX_BYTES) {
        readVerbatim(file, jobId);
      } else if (finishJob(jobId)) {
        setLocalError("That image could not be processed. Try a smaller one.");
      }
    }
  }

  function removePhoto() {
    cancelPendingJob();
    setPhoto("");
    setLocalError(null);
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
            <Button variant="ghost" size="sm" onClick={removePhoto}>
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
