import { OptimizedImage } from "@/components/optimized-image";

type HomeHeroShellProps = {
  heroImageUrl: string | null;
  children: React.ReactNode;
};

export function HomeHeroShell({ heroImageUrl, children }: HomeHeroShellProps) {
  return (
    <div className={heroImageUrl ? "home-hero home-hero--photo" : "home-hero home-hero--plain"}>
      {heroImageUrl ? (
        <>
          <div aria-hidden="true" className="home-hero__backdrop">
            <OptimizedImage
              alt=""
              className="home-hero__image"
              fill
              priority
              sizes="100vw"
              src={heroImageUrl}
            />
          </div>
          <div aria-hidden="true" className="home-hero__overlay" />
        </>
      ) : null}
      <div className="home-hero__content site-shell">{children}</div>
    </div>
  );
}
