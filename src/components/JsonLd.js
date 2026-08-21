function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLd({ id, data }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
