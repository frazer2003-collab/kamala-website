import Image, { type ImageProps } from "next/image";

function canOptimizeRemoteImage(src: string) {
  try {
    const hostname = new URL(src).hostname;
    return hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

type OptimizedImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
};

export function OptimizedImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fill,
  width,
  height,
}: OptimizedImageProps) {
  if (!src) {
    return null;
  }

  if (!canOptimizeRemoteImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} className={className} height={height} src={src} width={width} />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill={fill}
      height={height}
      priority={priority}
      sizes={sizes}
      src={src}
      width={width}
    />
  );
}
