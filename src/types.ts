// NS Reisinformatie API types

export interface NSDeparture {
  direction: string;
  name: string;           // Train number/name
  plannedDateTime: string; // ISO datetime
  actualDateTime?: string;
  plannedTrack?: string;
  actualTrack?: string;
  cancelled: boolean;
  product: {
    categoryCode: string; // IC, SPR, etc.
    longCategoryName: string;
    number: string;
  };
  departureStatus: string; // INCOMING, ON_STATION, DEPARTED
  messages?: Array<{ message: string; style: string }>;
}

export interface NSDeparturesResponse {
  payload: {
    departures: NSDeparture[];
    source: string;
  };
}

export interface NSDisruption {
  id: string;
  type: 'DISRUPTION' | 'MAINTENANCE';
  isActive: boolean;
  title: string;
  topic?: string;
  start?: string;
  end?: string;
  summaryAdditionalTravelTime?: {
    label: string;
    shortLabel: string;
    minimumDurationInMinutes: number;
    maximumDurationInMinutes: number;
  };
  alternativeTransportAdvice?: string;
  consequenceAdvice?: string;
  header?: string;
  sectionMessages?: Array<{ text: string }>;
  situationMessages?: Array<{
    text: string;
    consequences?: Array<{ type: string; description: string }>;
  }>;
  publicationSections?: Array<{
    consequence: {
      section: {
        stations: Array<{ uicCode: string; name: string }>;
      };
      description: string;
      level: string;
    };
  }>;
}

export interface NSDisruptionsResponse {
  disruptions?: NSDisruption[];
}

export interface TrainInfo {
  plannedTime: string;      // HH:MM
  actualTime: string;       // HH:MM
  delayMinutes: number;
  track: string;
  trainType: string;
  cancelled: boolean;
  messages: string[];
}

export interface AppData {
  departures: TrainInfo[];
  disruptions: NSDisruption[];
  fetchedAt: Date;
  targetDate: string; // e.g. "woensdag 29 oktober"
}
