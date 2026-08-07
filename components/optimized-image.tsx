import Image, { type ImageProps } from "next/image";

function canOptimizeImage(src: string) {
  if (src.startsWith("/")) {
    return true;
  }

  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

type OptimizedImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
};

/** Single default quality keeps the image CDN cache key from forking. */
const DEFAULT_IMAGE_QUALITY = 70;

export function OptimizedImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fill,
  width,
  height,
  loading,
  quality = DEFAULT_IMAGE_QUALITY,
}: OptimizedImageProps) {
  if (!src) {
    return null;
  }

  if (!canOptimizeImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className={className}
        height={height}
        loading={loading ?? (priority ? "eager" : "lazy")}
        src={src}
        width={width}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill={fill}
      height={height}
      loading={loading}
      priority={priority}
      quality={quality}
      sizes={sizes}
      src={src}
      width={width}
    />
  );
}
