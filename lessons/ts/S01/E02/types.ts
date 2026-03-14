/**
 * Suspect from S01E01 answer — minimal data needed for findhim.
 */
export type Suspect = {
  name: string;
  surname: string;
  born: number;
};

/**
 * Power plant with coordinates for Haversine distance.
 */
export type PowerPlant = {
  code: string;
  city: string;
  lat: number;
  lon: number;
};

/**
 * Final answer payload for /verify (task: findhim).
 */
export type FindhimAnswer = {
  name: string;
  surname: string;
  accessLevel: number;
  powerPlant: string;
};
