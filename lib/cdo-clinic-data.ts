export interface DentalServiceCategory {
  id: string;
  title: string;
  tagline: string;
  iconName: string;
  badge: string;
  description: string;
  procedures: {
    name: string;
    description: string;
    duration: string;
    priceRange: string;
    benefits: string[];
  }[];
}

export interface DentistProfileData {
  id: string;
  name: string;
  title: string;
  prcLicense: string;
  photoUrl: string;
  specialty: string;
  education: string;
  certifications: string[];
  experienceYears: number;
  bio: string;
  cdoClinicDays: {
    branchName: string;
    days: string;
    hours: string;
  }[];
}

export const CDO_BRANCHES_DATA = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "downtown-limketkai",
    name: "Downtown CDO Flagship (Limketkai Hub)",
    shortName: "Downtown (Limketkai)",
    address: "Level 2, Gateway Hub, Limketkai Center, Lapasan, Cagayan de Oro City, 9000 Misamis Oriental",
    phone: "+63 88 850 1234",
    mobile: "+63 917 123 4567",
    email: "downtown.cdo@cdgdental.ph",
    hours: "Monday – Saturday: 9:00 AM – 6:00 PM (Sunday by appointment)",
    landmarks: "Directly connected to Limketkai Mall, 3 mins from Centrio Ayala Mall and Xavier University Ateneo de Cagayan.",
    parking: "Ample covered mall parking with elevator access directly to 2nd Floor Gateway."
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "uptown-pueblo",
    name: "Uptown CDO Premier (Pueblo de Oro Hub)",
    shortName: "Uptown (Pueblo de Oro)",
    address: "Masterson Mile, Pueblo de Oro Township, Uptown, Cagayan de Oro City, 9000 Misamis Oriental",
    phone: "+63 88 851 5678",
    mobile: "+63 918 987 6543",
    email: "uptown.cdo@cdgdental.ph",
    hours: "Monday – Saturday: 9:00 AM – 6:00 PM",
    landmarks: "Right beside SM City CDO Uptown, across Pueblo Golf Course and near Xavier High School.",
    parking: "Dedicated ground-floor clinic reserved parking right in front of the clinic entrance."
  }
];

export const CDO_DENTISTS_DATA: DentistProfileData[] = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    name: "Dr. Kenneth Galve, DDM, FICOI",
    title: "Lead Dental Surgeon & Cosmetic Dentistry Specialist",
    prcLicense: "0074218",
    photoUrl: "/images/dentist-dr-kenneth.jpg",
    specialty: "Cosmetic Smile Design, Porcelain Veneers & Full Mouth Rehabilitation",
    education: "Doctor of Dental Medicine, University of the Philippines Manila (UPM)",
    certifications: [
      "Fellow, International Congress of Oral Implantologists (FICOI)",
      "Certified Digital Smile Design (DSD) Clinician",
      "Active Member, Philippine Dental Association (PDA - CDO Chapter)"
    ],
    experienceYears: 14,
    bio: "A native of Northern Mindanao, Dr. Galve combines clinical rigor with artistic precision. Known for transformative porcelain veneers and complex full-arch rehabilitation, he is dedicated to delivering hospital-grade, pain-free dental care to Cagayan de Oro families.",
    cdoClinicDays: [
      { branchName: "Downtown (Limketkai)", days: "Mon, Wed, Fri", hours: "9:00 AM – 5:00 PM" },
      { branchName: "Uptown (Pueblo de Oro)", days: "Tue, Thu, Sat", hours: "9:00 AM – 6:00 PM" }
    ]
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    name: "Dr. Andrea Reyes, DDM, MS (Ortho)",
    title: "Specialist Orthodontist & Clear Aligner Provider",
    prcLicense: "0081943",
    photoUrl: "/images/dentist-dr-andrea.jpg",
    specialty: "Clear Invisible Aligners, Self-Ligating Braces & Adolescent Orthodontics",
    education: "Master of Science in Orthodontics, Centro Escolar University; DDM, University of the East",
    certifications: [
      "Certified Clear Aligner Provider",
      "Member, Association of Philippine Orthodontists (APO)",
      "Specialist in Low-Friction Damon Self-Ligating Systems"
    ],
    experienceYears: 11,
    bio: "Dr. Reyes has straightened over 1,500 smiles across Mindanao. Her philosophy centers on gentle, non-extraction orthodontic planning whenever possible, harmonizing facial aesthetics with long-term bite stability.",
    cdoClinicDays: [
      { branchName: "Downtown (Limketkai)", days: "Tue, Thu, Sat", hours: "9:00 AM – 6:00 PM" }
    ]
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    name: "Dr. Marcus Lim, DDM, MSc (Perio)",
    title: "Periodontist & Oral Implantologist",
    prcLicense: "0069312",
    photoUrl: "/images/dentist-dr-marcus.jpg",
    specialty: "Advanced Gum Disease Laser Surgery, Bone Grafting & Dental Implants",
    education: "Residency in Periodontal Surgery, University of the Philippines - PGH; DDM, CEU",
    certifications: [
      "Diplomate Eligible, Philippine Society of Periodontology (PSP)",
      "Advanced Guided Bone Regeneration (GBR) Specialist",
      "Minimally Invasive Microsurgical Periodontist"
    ],
    experienceYears: 16,
    bio: "Dr. Lim is Northern Mindanao's premier specialist for severe periodontitis and missing tooth replacement. Utilizing dental lasers and 3D computer-guided implant planning, he saves natural teeth and restores chewing function with zero discomfort.",
    cdoClinicDays: [
      { branchName: "Uptown (Pueblo de Oro)", days: "Mon, Wed, Fri", hours: "9:30 AM – 5:30 PM" }
    ]
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    name: "Dr. Sophia Valdez, DDM",
    title: "General Dental Practitioner & Endodontist",
    prcLicense: "0092410",
    photoUrl: "/images/dentist-dr-sophia.jpg",
    specialty: "Rotary Root Canal Therapy, Ultrasonic Prophylaxis & Aesthetic Bonding",
    education: "Doctor of Dental Medicine, Davao Medical School Foundation",
    certifications: [
      "Certified in Rotary Nickel-Titanium Endodontics",
      "Pediatric Gentle Handling Certificate",
      "Active Member, PDA CDO Chapter"
    ],
    experienceYears: 8,
    bio: "Celebrated for her remarkably gentle touch, Dr. Valdez is the favorite doctor of anxious patients and young children in CDO. She specializes in single-visit root canal therapy and preventive oral health.",
    cdoClinicDays: [
      { branchName: "Downtown (Limketkai)", days: "Mon, Wed, Sat", hours: "9:00 AM – 6:00 PM" },
      { branchName: "Uptown (Pueblo de Oro)", days: "Tue, Thu, Fri", hours: "9:00 AM – 6:00 PM" }
    ]
  }
];

export const CDO_SERVICES_DATA: DentalServiceCategory[] = [
  {
    id: "periodontal-services",
    title: "Periodontal Services",
    tagline: "Specialized Care for Gum Disease, Bone Support & Gummy Smile Correction",
    iconName: "Shield",
    badge: "Gum & Bone Specialists",
    description: "Periodontal health is the foundation of your smile. Untreated gum disease is the leading cause of adult tooth loss. In our CDO clinics, Dr. Marcus Lim employs ultrasonic debridement and laser therapy to halt bone loss and regenerate healthy pink gums.",
    procedures: [
      {
        name: "Deep Ultrasonic Scaling & Root Planing",
        description: "Non-surgical deep cleaning under localized pain-free anesthesia to remove stubborn subgingival calculus, endotoxins, and bacteria from deep gum pockets.",
        duration: "60 mins per arch",
        priceRange: "₱2,500 – ₱4,000 / quadrant",
        benefits: ["Stops chronic bleeding gums", "Eliminates persistent bad breath", "Prevents bone deterioration"]
      },
      {
        name: "Aesthetic Crown Lengthening (Gummy Smile)",
        description: "Precision laser and micro-surgical contouring of excessive gum tissue to expose natural crown length for a balanced, harmonious smile line.",
        duration: "45 – 60 mins",
        priceRange: "₱4,500 – ₱8,000 / tooth",
        benefits: ["Eliminates excessive gummy display", "Creates symmetrical tooth proportions", "Permanent single-session outcome"]
      },
      {
        name: "Soft Tissue & Bone Regeneration Grafting",
        description: "Rebuilding recessed gums and deficient alveolar bone using biocompatible membranes to secure teeth and prepare ideal sites for dental implants.",
        duration: "75 mins",
        priceRange: "₱12,000 – ₱25,000",
        benefits: ["Covers sensitive exposed tooth roots", "Fortifies loose teeth", "Restores lost jaw bone volume"]
      },
      {
        name: "Periodontal Maintenance Recall Program",
        description: "Customized 3-to-4-month recall cleanings monitoring pocket depths to ensure periodontitis remains arrested permanently.",
        duration: "45 mins",
        priceRange: "₱1,800 – ₱2,500",
        benefits: ["Lifelong tooth preservation", "Continuous gum pocket depth monitoring"]
      }
    ]
  },
  {
    id: "cosmetic-dentistry",
    title: "Cosmetic Dentistry",
    tagline: "Smile Makeovers, Ultra-Thin Veneers & In-Office Laser Whitening",
    iconName: "Sparkles",
    badge: "Smile Makeover Hub",
    description: "Your smile is your most memorable feature. Led by Dr. Kenneth Galve, our cosmetic studio in Cagayan de Oro combines digital facial mapping with master ceramists to design natural, luminous smiles that look effortless and radiate confidence.",
    procedures: [
      {
        name: "Ultra-Thin Porcelain & Zirconia Veneers",
        description: "Micro-crafted ceramic shells bonded to the front of teeth to correct stubborn discoloration, minor misalignment, chips, and irregular tooth shapes.",
        duration: "2 visits (Prep & Delivery)",
        priceRange: "₱16,000 – ₱24,000 / tooth",
        benefits: ["Natural optical translucency", "Stain-resistant forever", "Minimally invasive enamel preservation"]
      },
      {
        name: "In-Office Philips Zoom Laser Teeth Whitening",
        description: "Professional medical-grade bleaching light that safely brightens your natural enamel by up to 8 shades in a single 60-minute appointment.",
        duration: "60 mins",
        priceRange: "₱9,500 – ₱14,000",
        benefits: ["Instant 8-shade brightening", "Desensitizing fluoride treatment included", "Safe for enamel & gums"]
      },
      {
        name: "Direct Cosmetic Composite Bonding",
        description: "Hand-sculpted nanohybrid composite resin layered directly over teeth to close gaps (diastema), fix chipped incisors, and correct uneven edges.",
        duration: "45 mins per tooth",
        priceRange: "₱2,800 – ₱4,500 / tooth",
        benefits: ["Single-visit immediate results", "No natural tooth reduction", "Budget-friendly smile upgrade"]
      },
      {
        name: "Comprehensive Full Smile Makeover",
        description: "Holistic aesthetic transformation combining veneers, gum recontouring, and teeth whitening tailored to your facial symmetry and skin tone.",
        duration: "Customized 2–3 visits",
        priceRange: "Consultation-based package",
        benefits: ["100% custom Digital Smile Design (DSD)", "Try on your new smile mockup before final bonding"]
      }
    ]
  },
  {
    id: "orthodontic-services",
    title: "Orthodontic Services",
    tagline: "Clear Invisible Aligners & Low-Profile Modern Braces in CDO",
    iconName: "Smile",
    badge: "Orthodontic Center",
    description: "Straight teeth do not just look stunning—they reduce wear, resolve TMJ headaches, and make cleaning effortless. Dr. Andrea Reyes offers clear removable aligners and friction-free Damon braces for children, teens, and working professionals in CDO.",
    procedures: [
      {
        name: "Clear Invisible Aligners System",
        description: "Removable, virtually undetectable clear plastic trays custom-manufactured from 3D digital scans. Change trays every 10–14 days to gently guide teeth into alignment.",
        duration: "6 to 18 months average",
        priceRange: "₱65,000 – ₱140,000 (Flexible installment plans)",
        benefits: ["100% invisible in social & business settings", "No food restrictions (removable while eating)", "Fewer clinic visits needed"]
      },
      {
        name: "Self-Ligating Low-Friction Braces (Damon System)",
        description: "State-of-the-art brackets that eliminate rubber elastics, using a sliding mechanism that moves teeth faster and with significantly less soreness.",
        duration: "12 to 24 months",
        priceRange: "₱45,000 – ₱75,000 (Monthly installments)",
        benefits: ["Faster treatment times", "Fewer adjustments required", "Gentler on tooth roots & bone"]
      },
      {
        name: "Aesthetic Ceramic / Sapphire Tooth-Colored Braces",
        description: "Translucent ceramic brackets that blend seamlessly with natural tooth shade for patients wanting fixed braces with minimal visibility.",
        duration: "14 to 24 months",
        priceRange: "₱40,000 – ₱65,000",
        benefits: ["Low aesthetic visibility", "Stain-resistant sapphire brackets", "Reliable alignment for complex bite issues"]
      },
      {
        name: "Custom Vivera & Hawley Retention Systems",
        description: "Durable post-orthodontic retainers engineered to maintain your perfect smile alignment permanently.",
        duration: "Single visit digital scan",
        priceRange: "₱4,500 – ₱8,000 / set",
        benefits: ["Guarantees teeth stay in place", "Clear, comfortable nightwear"]
      }
    ]
  },
  {
    id: "general-dentistry",
    title: "General Dentistry",
    tagline: "Pain-Free Checkups, Ultrasonic Prophylaxis & Complete Preventive Care",
    iconName: "Stethoscope",
    badge: "Family Preventive Care",
    description: "Preventive care is the most valuable investment in your health. Our general dentistry practice welcomes CDO families with a warm, judgment-free environment, pain-free ultrasonic cleanings, and high-definition intraoral cameras so you can see exactly what we see.",
    procedures: [
      {
        name: "Comprehensive Oral Exam & Digital Radiography",
        description: "Thorough 15-point oral exam including intraoral photo tour, periodontal screening, bite check, and low-radiation digital x-rays.",
        duration: "30 – 40 mins",
        priceRange: "₱800 – ₱1,500",
        benefits: ["Early detection of silent cavities", "Low-radiation digital periapical sensors", "Personalized treatment masterplan"]
      },
      {
        name: "Ultrasonic Prophylaxis & Air-Flow Polishing",
        description: "Gentle ultrasonic vibration to dislodge plaque and tartar, followed by Air-Flow erythritol powder polishing to remove stubborn coffee, tea, and tobacco stains.",
        duration: "40 – 50 mins",
        priceRange: "₱1,800 – ₱2,800",
        benefits: ["Zero scraping discomfort", "Leaves teeth feeling silky smooth", "Freshens breath immediately"]
      },
      {
        name: "Pit-and-Fissure Sealants & Fluoride Varnish",
        description: "Protective resin barriers placed on deep chewing grooves of molars to seal out food debris and bacteria, reinforced with topical fluoride enamel re-mineralization.",
        duration: "30 mins",
        priceRange: "₱900 – ₱1,500 / tooth",
        benefits: ["80% reduction in childhood and adult molar cavities", "Completely painless, no drilling"]
      },
      {
        name: "Bruxism Night Guards & TMJ Occlusal Splints",
        description: "Custom-molded dual-laminate oral splints worn during sleep to protect teeth from clenching, enamel chipping, and jaw joint TMJ strain.",
        duration: "2 visits",
        priceRange: "₱6,000 – ₱9,500",
        benefits: ["Stops morning jaw ache and tension headaches", "Prevents enamel flatting and cracked teeth"]
      }
    ]
  },
  {
    id: "restorative-dentistry",
    title: "Restorative Dentistry",
    tagline: "Nanohybrid Fillings, All-Ceramic Zirconia Crowns & Dental Implants",
    iconName: "Activity",
    badge: "Reconstruction & Implants",
    description: "When teeth are damaged by deep caries, fractures, or lost completely, our restorative team restores complete chewing power and aesthetic beauty using dental implants, monolithic zirconia crowns, and rotary root canal endodontics.",
    procedures: [
      {
        name: "Nanohybrid Tooth-Colored Composite Fillings",
        description: "Mercury-free, tooth-matching composite resin matched to your exact enamel shade, cured with high-intensity LED light for immediate eating.",
        duration: "30 – 45 mins",
        priceRange: "₱1,800 – ₱3,500 / surface",
        benefits: ["100% tooth-colored invisible blend", "Chemically bonds to reinforce remaining tooth", "Preserves natural tooth structure"]
      },
      {
        name: "CAD/CAM Monolithic Zirconia & Ceramic Crowns",
        description: "Full-coverage caps fabricated from indestructible dental zirconia or lithium disilicate (E.max) designed to restore severely cracked or root-canal treated teeth.",
        duration: "2 visits",
        priceRange: "₱14,000 – ₱22,000",
        benefits: ["Unbreakable structural strength", "Zero dark metal line at gum margin", "10-year durability track record"]
      },
      {
        name: "Titanium Dental Implants (Permanent Tooth Replacement)",
        description: "Surgically placed medical-grade titanium screw that integrates into your jawbone to act as an artificial root, topped with a custom ceramic crown.",
        duration: "Surgical placement + 3 month integration + Crown",
        priceRange: "₱65,000 – ₱95,000 (Complete implant + abutment + crown)",
        benefits: ["Looks, feels, and chews exactly like a natural tooth", "Prevents facial bone collapse", "Lifetime investment with proper hygiene"]
      },
      {
        name: "Rotary Endodontic Root Canal Therapy (RCT)",
        description: "Painless removal of infected tooth pulp using flexible nickel-titanium rotary files and biocompatible thermal obturation, saving a tooth that would otherwise need extraction.",
        duration: "1 – 2 visits (60–90 mins)",
        priceRange: "₱6,500 – ₱12,000 / tooth",
        benefits: ["Immediate relief from severe toothache", "Saves your natural tooth from extraction", "Painless with modern computerized anesthesia"]
      }
    ]
  }
];

export const CDO_PATIENT_REVIEWS = [
  {
    name: "Atty. Katrina Alcantara",
    location: "Pueblo de Oro, Uptown CDO",
    service: "Porcelain Veneers & Zoom Whitening",
    rating: 5,
    quote: "Dr. Kenneth Galve transformed my smile completely before my wedding. The clinic in Uptown CDO feels like a 5-star hotel, and the digital scan was so comfortable. Hands down the best dental clinic in Cagayan de Oro!",
    date: "2 weeks ago"
  },
  {
    name: "Engr. Miguel Fernandez",
    location: "Lapasan, Downtown CDO",
    service: "Single-Tooth Dental Implant",
    rating: 5,
    quote: "I lost my lower molar years ago and was terrified of implants. Dr. Marcus Lim explained the 3D CT scan and performed the surgery with ZERO pain. The new tooth feels exactly like my real one. Salamat CDG Dental!",
    date: "1 month ago"
  },
  {
    name: "Dr. Janice Ramos, MD",
    location: "Nazareth, Cagayan de Oro",
    service: "Clear Aligners & Deep Cleaning",
    rating: 5,
    quote: "As a physician, hospital-grade sterilization is my #1 priority. CDG Dental's autoclave protocols and Air-Flow cleanings are top notch. Dr. Andrea Reyes made my clear aligner journey smooth and invisible.",
    date: "3 weeks ago"
  }
];
