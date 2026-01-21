// data/fbsGeneric.ts
export type SeedTeam = { name: string; short_name?: string; conference: string };

export const FBS_GENERIC: SeedTeam[] = [
  // Atlantic
  { name: "Boston Scholars", conference: "Atlantic" },
  { name: "Raleigh Foxes", conference: "Atlantic" },
  { name: "Richmond Knights", conference: "Atlantic" },
  { name: "Pittsburgh Iron", conference: "Atlantic" },

  // Coastal
  { name: "Miami Storm", conference: "Coastal" },
  { name: "Tampa Tides", conference: "Coastal" },
  { name: "Norfolk Mariners", conference: "Coastal" },
  { name: "Charleston Palms", conference: "Coastal" },

  // Great Lakes
  { name: "Chicago Sparks", conference: "Great Lakes" },
  { name: "Detroit Wolves", conference: "Great Lakes" },
  { name: "Cleveland Owls", conference: "Great Lakes" },
  { name: "Madison Northwoods", conference: "Great Lakes" },

  // Plains
  { name: "Lincoln Plainsmen", conference: "Plains" },
  { name: "Wichita Wind", conference: "Plains" },
  { name: "Tulsa Oilers", conference: "Plains" },
  { name: "Omaha Rivermen", conference: "Plains" },

  // Mountain
  { name: "Boise Peaks", conference: "Mountain" },
  { name: "Denver Summit", conference: "Mountain" },
  { name: "Salt Lake Peaks", conference: "Mountain" },
  { name: "Albuquerque Suns", conference: "Mountain" },

  // Pacific
  { name: "Seattle Rain", conference: "Pacific" },
  { name: "Portland Timber", conference: "Pacific" },
  { name: "San Diego Waves", conference: "Pacific" },
  { name: "San Jose Hawks", conference: "Pacific" },

  // South
  { name: "Baton Rouge Stripes", conference: "South" },
  { name: "Birmingham Forge", conference: "South" },
  { name: "Memphis Blues", conference: "South" },
  { name: "Nashville Notes", conference: "South" },

  // Mid-America
  { name: "Toledo Rockets", conference: "Mid-America" },
  { name: "Akron Zips", conference: "Mid-America" },
  { name: "Dayton Flyers", conference: "Mid-America" },
  { name: "Columbus Union", conference: "Mid-America" },

  // Chesapeake (example of your “Terps vibe” without real IP)
  { name: "Chesapeake Turtles", conference: "Chesapeake" },
  { name: "Annapolis Anchors", conference: "Chesapeake" },
  { name: "Baltimore Harbors", conference: "Chesapeake" },
  { name: "Dover Foxes", conference: "Chesapeake" },

  // Independent
  { name: "Las Vegas Lights", conference: "Independent" },
  { name: "Austin Rangers", conference: "Independent" },
  { name: "Lynchburg Fires", conference: "Independent" },
  { name: "Phoenix Suns", conference: "Independent" }
];
