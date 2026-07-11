import { OptimizedImage } from "@/components/optimized-image";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";

type HomeHeroShellProps = {
  heroImageUrl: string | null;
  children: React.ReactNode;
};

export function HomeHeroShell({ heroImageUrl, children }: HomeHeroShellProps) {
  const resolvedHero = resolveHeroImageUrl(heroImageUrl);

  return (
    <div className="home-hero home-hero--atmosphere home-hero--photo">
      <div aria-hidden="true" className="home-hero__backdrop">
        {resolvedHero ? (
          <OptimizedImage
            alt=""
            className="home-hero__image"
            fill
            priority
            sizes="100vw"
            src={resolvedHero}
          />
        ) : (
          <div className="home-hero__garden-fallback" />
        )}
      </div>
      <div aria-hidden="true" className="home-hero__overlay" />
      <div className="home-hero__content site-shell">{children}</div>
    </div>
  );
}
