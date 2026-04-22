export type ListenResponse = {
  code: number;
  message: string;
  transcription?: string;
  attachment?: string;
  meta?: string;
  filesize?: number;
};

export type RouterKind =
  | "text"
  | "noise"
  | "binary-json"
  | "binary-text"
  | "binary-image-small"
  | "binary-image-large"
  | "binary-audio"
  | "binary-other"
  | "end";

export type RouterDecision = {
  kind: RouterKind;
  mimeType?: string;
  filesizeBytes?: number;
};

export type FactKind =
  | "cityName"
  | "cityArea"
  | "warehousesCount"
  | "phoneNumber"
  | "other";

export type Fact = {
  kind: FactKind;
  value: string;
  confidence: number;
  source: string;
};

export type FactCandidate = {
  value: string;
  votes: number;
  totalConfidence: number;
};

export type FinalAnswer = {
  cityName: string;
  cityArea: string;
  warehousesCount: number;
  phoneNumber: string;
};

export type TextAnalysisResult = {
  isNoise: boolean;
  facts: Fact[];
};
