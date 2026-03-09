export type PersonRecord = {
  name: string;
  surname: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  birthCountry: string;
  job: string;
};

export type JobTag =
  | "IT"
  | "transport"
  | "edukacja"
  | "medycyna"
  | "praca z ludźmi"
  | "praca z pojazdami"
  | "praca fizyczna";

export type PersonAnswer = {
  name: string;
  surname: string;
  gender: string;
  born: number;
  city: string;
  tags: JobTag[];
};
