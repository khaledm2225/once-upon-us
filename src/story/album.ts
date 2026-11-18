// The photo album after the story: up to 10 photos, two on each page, each
// with its date. The story's own book shows the demo album: photos of the
// fictional Grace and Henry made with an image AI for this demo (said so in
// CREDITS.md). A family's gift shows only the photos the family saved.

export interface AlbumPhoto {
  /** Where the image comes from: a file in the site, or a data URL. */
  src: string;
  /** The date printed under the photo, for example "August 1968". */
  date: string;
}

export const ALBUM_SIZE = 10;

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "August 1968", or just "1968" when the month is not known. */
export function dateLabel(month: number | null, year: number): string {
  return month === null ? String(year) : `${MONTHS[month]} ${year}`;
}

/** Reads a label like "August 1968" or "1968" back into its month and year. */
export function readDateLabel(label: string): { month: number | null; year: number | null } {
  const [first, second] = label.trim().split(/\s+/);
  const month = second === undefined ? -1 : MONTHS.indexOf(first as (typeof MONTHS)[number]);
  const year = Number.parseInt(second ?? first, 10);
  return { month: month >= 0 ? month : null, year: Number.isFinite(year) ? year : null };
}

const demo = (file: string, date: string): AlbumPhoto => ({
  src: `${import.meta.env.BASE_URL}album/${file}`,
  date,
});

export const demoAlbum: readonly AlbumPhoto[] = [
  demo('photo-01.jpg', 'November 1966'),
  demo('photo-02.jpg', 'February 1967'),
  demo('photo-03.jpg', 'August 1968'),
  demo('photo-04.jpg', 'January 1969'),
  demo('photo-05.jpg', 'December 1972'),
  demo('photo-06.jpg', 'December 1980'),
  demo('photo-07.jpg', 'January 1988'),
  demo('photo-08.jpg', 'August 1993'),
  demo('photo-09.jpg', 'December 2012'),
  demo('photo-10.jpg', 'November 2026'),
];
