import type {
  NSDeparturesResponse,
  NSDisruptionsResponse,
  NSDisruption,
  TrainInfo,
  AppData,
} from './types';

const PROXY = '/.netlify/functions/ns-proxy';

/** Determines the "next morning" date from the user's local time.
 *  If it's before 09:00 today, use today; otherwise use tomorrow. */
export function getTargetDate(): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(9, 0, 0, 0); // 09:00 today

  if (now >= candidate) {
    // We're past the window, aim for tomorrow
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

/** Fetch departures from Utrecht Centraal (station code: UT) in the 08:00-09:00 window */
async function fetchDepartures(targetDate: Date): Promise<TrainInfo[]> {
  // We request departures around 08:00 on the target date
  const dateTimeParam = new Date(targetDate);
  dateTimeParam.setHours(7, 55, 0, 0); // a bit before 08:00

  const params = new URLSearchParams({
    path: 'v2/departures',
    station: 'UT',
    dateTime: dateTimeParam.toISOString(),
    maxJourneys: '30',
  });

  const res = await fetch(`${PROXY}?${params}`);
  if (!res.ok) throw new Error(`Departures API fout: ${res.status}`);

  const data: NSDeparturesResponse = await res.json();
  const departures = data?.payload?.departures ?? [];

  // Filter: direction Amsterdam, between 08:00 and 09:00
  const windowStart = new Date(targetDate);
  windowStart.setHours(8, 0, 0, 0);
  const windowEnd = new Date(targetDate);
  windowEnd.setHours(9, 0, 0, 0);

  return departures
    .filter((dep) => {
      const planned = new Date(dep.plannedDateTime);
      const directionMatch =
        dep.direction.toLowerCase().includes('amsterdam') ||
        dep.direction.toLowerCase().includes('asd') ||
        dep.name.toLowerCase().includes('amsterdam');
      return planned >= windowStart && planned < windowEnd && directionMatch;
    })
    .map((dep) => ({
      plannedTime: toHHMM(dep.plannedDateTime),
      actualTime: dep.actualDateTime ? toHHMM(dep.actualDateTime) : toHHMM(dep.plannedDateTime),
      delayMinutes: calcDelay(dep.plannedDateTime, dep.actualDateTime),
      track: dep.actualTrack ?? dep.plannedTrack ?? '–',
      trainType: dep.product.categoryCode,
      cancelled: dep.cancelled,
      messages: dep.messages?.map((m) => m.message) ?? [],
    }));
}

/** Fetch active disruptions that affect the Utrecht–Amsterdam corridor */
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
      text.includes('ut') ||
      text.includes('asd')
    );
  });
}

/** Main data fetch function */
export async function fetchTrainData(): Promise<AppData> {
  const targetDate = getTargetDate();

  const [departures, disruptions] = await Promise.all([
    fetchDepartures(targetDate),
    fetchDisruptions(),
  ]);

  return {
    departures,
    disruptions,
    fetchedAt: new Date(),
    targetDate: formatTargetDate(targetDate),
  };
}
