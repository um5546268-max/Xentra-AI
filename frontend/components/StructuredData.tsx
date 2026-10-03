export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Xentra AI",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    description:
      "Xentra AI is an AI software platform for learning, coding, productivity, and more.",
    url: "https://new.xentraai.uk/",
    creator: {
      "@type": "Organization",
      name: "Xentra AI",
      url: "https://new.xentraai.uk/",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}