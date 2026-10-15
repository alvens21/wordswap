"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarUploadFieldProps {
  /** Current data URL or undefined. */
  value: string | undefined;
  /** Called with the new data URL, or undefined when cleared. */
  onChange: (dataUrl: string | undefined) => void;
  /** Accessible label for the upload button. */
  label?: string;
}

const MAX_FILE_SIZE = 200 * 1024; // 200 KB

/**
 * A compact image picker: shows a circular preview and a "Choose image"
 * button. Images are resized to 96×96 and stored as base64 data URLs
 * so they can travel inside the room JSON without a file server.
 */
export default function AvatarUploadField({
  value,
  onChange,
  label = "Profile image",
}: AvatarUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const handleClick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 200 KB.");
      return;
    }

    // Resize to 96×96 via a canvas to keep payload small.
    const dataUrl = await resizeImage(file, 96);
    onChange(dataUrl);
  };

  const handleClear = () => {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="field">
      <span className="text-label">{label}</span>
      <div className="avatar-upload">
        <div className="avatar-upload-preview">
          {value ? (
            <img src={value} alt="Preview" />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="row row-sm">
          <button
            type="button"
            className={cn("avatar-upload-btn")}
            onClick={handleClick}
          >
            {value ? "Change" : "Choose image"}
          </button>
          {value ? (
            <button
              type="button"
              className={cn("avatar-upload-btn")}
              onClick={handleClear}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error ? <span className="field-error">{error}</span> : null}
      <span className="field-hint">
        JPG or PNG, max 200 KB. The image is resized automatically.
      </span>
    </div>
  );
}

/** Resizes an image file to a square of `size` pixels and returns a data URL. */
function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        // Center-crop to square.
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
