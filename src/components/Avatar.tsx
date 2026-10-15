"use client";

import { cn, initialsOf } from "@/lib/utils";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Displays a profile image if available, otherwise falls back to
 * the player's initials inside a colored circle.
 */
export default function Avatar({ name, imageUrl, size = "md" }: AvatarProps) {
  const sizeClass = size === "sm" ? "avatar-sm" : size === "lg" ? "avatar-lg" : "";

  if (imageUrl) {
    return (
      <span className={cn("avatar-image", sizeClass)} aria-label={name}>
        <img src={imageUrl} alt={`${name}'s avatar`} />
      </span>
    );
  }

  return (
    <span className={cn("avatar", sizeClass)} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
