type HomePageJsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function HomePageJsonLd({ data }: HomePageJsonLdProps) {
  const graphs = Array.isArray(data) ? data : [data];

  return (
    <>
      {graphs.map((graph, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
          key={index}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
