type HomePageJsonLdProps = {
  data: Record<string, unknown>;
};

export function HomePageJsonLd({ data }: HomePageJsonLdProps) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  );
}
