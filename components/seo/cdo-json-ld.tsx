import React from "react";

export function CdoJsonLd() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": "CDG Dental Clinic Cagayan de Oro",
    "alternateName": "CDG Dental Clinic CDO",
    "description": "Premier modern dental clinic in Cagayan de Oro City (CDO), Northern Mindanao. Offering painless cosmetic dentistry, porcelain veneers, clear aligners, dental implants, periodontal laser therapy, and preventive dental care.",
    "url": "https://cdgdental.ph",
    "logo": "https://cdgdental.ph/images/hero-clinic.jpg",
    "image": "https://cdgdental.ph/images/hero-clinic.jpg",
    "telephone": "+63 88 850 1234",
    "priceRange": "₱₱",
    "currenciesAccepted": "PHP",
    "paymentAccepted": "Cash, Credit Card, GCash, Bank Transfer",
    "department": [
      {
        "@type": "Dentist",
        "name": "CDG Dental Clinic — Downtown CDO (Limketkai Hub)",
        "telephone": "+63 88 850 1234",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Level 2, Gateway Hub, Limketkai Center, Lapasan",
          "addressLocality": "Cagayan de Oro City",
          "addressRegion": "Misamis Oriental",
          "postalCode": "9000",
          "addressCountry": "PH"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 8.4842,
          "longitude": 124.6548
        },
        "openingHours": "Mo-Sa 09:00-18:00"
      },
      {
        "@type": "Dentist",
        "name": "CDG Dental Clinic — Uptown CDO (Pueblo de Oro Hub)",
        "telephone": "+63 88 851 5678",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Masterson Mile, Pueblo de Oro Township, Uptown",
          "addressLocality": "Cagayan de Oro City",
          "addressRegion": "Misamis Oriental",
          "postalCode": "9000",
          "addressCountry": "PH"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 8.4418,
          "longitude": 124.6231
        },
        "openingHours": "Mo-Sa 09:00-18:00"
      }
    ],
    "areaServed": [
      { "@type": "City", "name": "Cagayan de Oro City" },
      { "@type": "AdministrativeArea", "name": "Misamis Oriental" },
      { "@type": "AdministrativeArea", "name": "Bukidnon" },
      { "@type": "AdministrativeArea", "name": "Northern Mindanao" }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Dental Services",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Periodontal Services (Gum Disease & Bone Health)" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Cosmetic Dentistry & Porcelain Veneers" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Orthodontic Clear Aligners & Braces" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "General Preventive Dentistry & Ultrasonic Cleaning" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Restorative Dentistry & Dental Implants" } }
      ]
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
