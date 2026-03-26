export type ToolRequest = {
  params: string;
};

export type ToolResponse = {
  output: string;
};

export type City = {
  name: string;
  code: string;
};

export type Item = {
  name: string;
  code: string;
  nameNormalized: string; // lowercase, no diacritics
};

export type Connection = {
  itemCode: string;
  cityCode: string;
};

export type CsvData = {
  cities: City[];
  items: Item[];
  connections: Connection[];
  cityByCode: Map<string, string>; // code → name
  itemByCode: Map<string, Item>; // code → Item
  itemsByName: Item[]; // sorted for search
  connectionsByItem: Map<string, string[]>; // itemCode → cityCode[]
};

export type GuardResult = {
  allowed: boolean;
  reason: string;
};

export type SearchNormResult = {
  keywords: string[];
};

export type CitiesNormResult = {
  itemCode: string;
  itemName: string;
};
