import type {
  NSDisruptionsResponse,
  NSDisruption,
  TrainInfo,
  AppData,
} from './types';

const PROXY = '/.netlify/functions/ns-proxy';

/** NS Trip response types */
interface NSTripLegOrigin {
  plannedDateTime: string;
  actualDateTime?: string;
  plannedTrack?: string;
  actualTrack?: string;
}

interface NSTripLeg {
  origin: NSTripLegOrigin;
  product?: {
    categoryCode: string;
    number: string;
    longCategoryName: string;
  };
}

interface NSTrip {
  status: string;        // NORMAL, DISRUPTION, CANCELLED, etc.
  cancelled?: boolean;
  legs: NSTripLeg[];
  messages?: Array<{ message: string; type: string }>;
}

interface NSTripsResponse {
  trips?: NSTrip[];
}

/** Determines the "next morning" date from the user's local time.
 *  If it's before 09:00 today, use today; otherwise use tomorrow. */
export function getTargetDate(): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(9, 0, 0, 0);

  if (now >= candidate) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

export function formatTargetDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Format a ISO datetime string to HH:MM */
function toHHMM(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Calculate delay in minutes between planned and actual departure */
function calcDelay(planned: string, actual?: string): number {
  if (!actual) return 0;
  const diff = (new Date(actual).getTime() - new Date(planned).getTime()) / 60000;
  return Math.round(diff);
}

/**
 * Fetch trips from Utrecht Centraal to Amsterdam Centraal
 * using the /v3/trips endpoint which supports future date queries.
 */
async function fetchTrips(targetDate: Date): Promise<TrainInfo[]> {
  // Build datetime for 08:00 on the target morning
  const dt = new Date(targetDate);
  dt.setHours(8, 0, 0, 0);

  // Format as local ISO string (without Z, so NS interprets it as local time)
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateTimeLocal = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;

  const params = new URLSearchParams({
    path: 'v3/trips',
    fromStation: 'Utrecht Centraal',
    toStation: 'Amsterdam Centraal',
    dateTime: dateTimeLocal,
    searchForArrival: 'false',
    originWalk: '0',
    destinationWalk: '0',
  });

  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`Trips API fout: ${res.status}`);

  const data: NSTripsResponse = await res.json();
  const trips = data?.trips ?? [];

  // Filter to only show trips departing between 08:00 and 09:00
  const windowStart = new Date(targetDate);
  windowStart.setHours(8, 0, 0, 0);
  const windowEnd = new Date(targetDate);
  windowEnd.setHours(9, 0, 0, 0);

  return trips
    .filter((trip) => {
      const firstLeg = trip.legs?.[0];
      if (!firstLeg) return false;
      const depTime = new Date(firstLeg.origin.plannedDateTime);
      return depTime >= windowStart && depTime < windowEnd;
    })
    .map((trip): TrainInfo => {
      const leg = trip.legs[0];
      const origin = leg.origin;
      const planned = origin.plannedDateTime;
      const actual = origin.actualDateTime;
      const delay = calcDelay(planned, actual);
      const cancelled = trip.cancelled === true || trip.status === 'CANCELLED';

      return {
        plannedTime: toHHMM(planned),
        actualTime: actual ? toHHMM(actual) : toHHMM(planned),
        delayMinutes: delay,
        track: origin.actualTrack ?? origin.plannedTrack ?? '–',
        trainType: leg.product?.categoryCode ?? '?',
        cancelled,
        messages: trip.messages?.map((m) => m.message).filter(Boolean) ?? [],
      };
    });
}

/** Fetch active disruptions that may affect the Utrecht–Amsterdam corridor */
async function fetchDisruptions(): Promise<NSDisruption[]> {
  const params = new URLSearchParams({
    path: 'v3/disruptions',
    actual: 'true',
    lang: 'nl',
  });

  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`Disruptions API fout: ${res.status}`);

  const data: NSDisruptionsResponse = await res.json();
  const all = data?.disruptions ?? [];

  // Filter disruptions that mention Utrecht or Amsterdam
  return all.filter((d) => {
    const text = `${d.title ?? ''} ${d.topic ?? ''} ${d.header ?? ''}`.toLowerCase();
    return (
      text.includes('utrecht') ||
      text.includes('amsterdam') ||
      text.includes(' ut ') ||
      text.includes(' asd ')
    );
  });
}

/** Main data fetch function */
export async function fetchTrainData(): Promise<AppData> {
  const targetDate = getTargetDate();

  const [departures, disruptions] = await Promise.all([
    fetchTrips(targetDate),
    fetchDisruptions(),
  ]);

  return {
    departures,
    disruptions,
    fetchedAt: new Date(),
    targetDate: formatTargetDate(targetDate),
  };
}
