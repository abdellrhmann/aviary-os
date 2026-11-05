import { Bird as BirdIcon } from "lucide-react";

interface BirdThumbProps {
  url?: string | null;
  alt: string;
  size?: "sm" | "md";
}

export function BirdThumb({ url, alt, size = "md" }: BirdThumbProps) {
  const box = size === "sm" ? "w-9 h-9" : "w-10 h-10";

  return (
    <div
      className={`${box} shrink-0 rounded-md border border-border bg-muted-surface overflow-hidden flex items-center justify-center`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <BirdIcon className="w-4 h-4 text-muted opacity-60" aria-hidden="true" />
      )}
    </div>
  );
}
