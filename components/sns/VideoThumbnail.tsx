import Image from "next/image";
import { cn } from "@/lib/cn";

type VideoThumbnailProps = {
  alt: string;
  className?: string;
  src: string;
};

export function VideoThumbnail({ alt, className, src }: VideoThumbnailProps) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-md border border-white/10 bg-white/[0.04]",
        className,
      )}
    >
      <Image
        alt={alt}
        className="object-cover transition duration-300 group-hover:scale-[1.025]"
        fill
        sizes="(min-width: 1024px) 240px, 100vw"
        src={src}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/35 to-transparent" />
    </div>
  );
}
