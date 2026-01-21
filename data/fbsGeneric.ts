export type SeedTeam = { name: string; short_name?: string; conference: string };
// Starter set. Expand later.
export const FBS_GENERIC: SeedTeam[] = [
  { name: "Chesapeake Turtles", conference: "Atlantic" },
  { name: "Annapolis Anchors", conference: "Atlantic" },
  { name: "Baltimore Harbors", conference: "Atlantic" },
  { name: "Dover Foxes", conference: "Atlantic" },

  { name: "Miami Storm", conference: "Coastal" },
  { name: "Tampa Tides", conference: "Coastal" },
  { name: "Orlando Knights", conference: "Coastal" },
  { name: "Jacksonville Waves", conference: "Coastal" },

  { name: "Lynchburg Fires", conference: "Appalachian" },
  { name: "Roanoke Ridges", conference: "Appalachian" },
  { name: "Knoxville Ridge", conference: "Appalachian" },
  { name: "Asheville Oaks", conference: "Appalachian" },

  { name: "Austin Rangers", conference: "Plains" },
  { name: "Dallas Stallions", conference: "Plains" },
  { name: "Houston Comets", conference: "Plains" },
  { name: "San Antonio Runners", conference: "Plains" },

  { name: "Boise Peaks", conference: "Mountain" },
  { name: "Denver Summit", conference: "Mountain" },
  { name: "Salt Lake Peaks", conference: "Mountain" },
  { name: "Albuquerque Suns", conference: "Mountain" },

  { name: "Seattle Rain", conference: "Pacific" },
  { name: "Portland Pines", conference: "Pacific" },
  { name: "San Diego Waves", conference: "Pacific" },
  { name: "San Jose Hawks", conference: "Pacific" }
];
