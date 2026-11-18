import { ALBUM_SIZE, MONTHS, dateLabel, demoAlbum, readDateLabel } from '../story/album.js';
import { canReadPhoto, forgetUnfinishedSave, saveGiftPhotos } from '../story/gift-photos.js';

// The family photos on the start page: up to 10 photos, each with its month
// (optional) and year. "Save photos" sends them to the server as one new set,
// and its id joins the gift link. Until then nothing leaves the device.
// "Use sample photos" fills the list with the demo album (AI generated
// pictures of the fictional Grace and Henry), so anyone can try a gift
// without their own photos.

interface Row {
  file: File;
  thumb: string;
  month: number | null;
  year: number | null;
  /** The demo album file this row came from, for sample photos. */
  sample?: string;
}

const FIRST_YEAR = 1850;

export function setupPhotoPicker(hasSavedPhotos: () => boolean, onSaved: (id: string) => void): void {
  const list = document.getElementById('photo-list') as HTMLUListElement;
  const input = document.getElementById('photo-input') as HTMLInputElement;
  const addButton = document.getElementById('add-photos') as HTMLButtonElement;
  const sampleButton = document.getElementById('sample-photos') as HTMLButtonElement;
  const saveButton = document.getElementById('save-photos') as HTMLButtonElement;
  const status = document.getElementById('photo-status') as HTMLElement;
  const lastYear = new Date().getFullYear();

  let rows: Row[] = [];
  let saving = false;
  let adding = false;
  /** True right after a save, until the list changes again. */
  let saved = false;

  const say = (text: string) => {
    status.textContent = text;
    status.hidden = text === '';
  };

  const refresh = () => {
    addButton.disabled = saving || adding || rows.length >= ALBUM_SIZE;
    sampleButton.disabled = addButton.disabled;
    saveButton.hidden = rows.length === 0 || saved;
    saveButton.disabled = saving || adding;
  };

  /** Any change after a save must be saved again before the link shows it. */
  const changed = () => {
    forgetUnfinishedSave();
    if (saved) {
      saved = false;
      say('Changes not saved yet.');
    } else {
      say('');
    }
    refresh();
  };

  const render = () => {
    list.replaceChildren(
      ...rows.map((row, index) => {
        const number = index + 1;
        const item = document.createElement('li');
        item.className = 'photo-row';

        const thumb = document.createElement('img');
        thumb.className = 'photo-thumb';
        thumb.src = row.thumb;
        thumb.alt = `Photo ${number}`;

        const month = document.createElement('select');
        month.setAttribute('aria-label', `Month of photo ${number}`);
        month.add(new Option('Month', ''));
        MONTHS.forEach((name, value) => month.add(new Option(name, String(value))));
        month.value = row.month === null ? '' : String(row.month);
        month.addEventListener('change', () => {
          row.month = month.value === '' ? null : Number(month.value);
          changed();
        });

        const year = document.createElement('input');
        year.type = 'number';
        year.inputMode = 'numeric';
        year.min = String(FIRST_YEAR);
        year.max = String(lastYear);
        year.placeholder = 'Year';
        year.setAttribute('aria-label', `Year of photo ${number}`);
        year.value = row.year === null ? '' : String(row.year);
        year.addEventListener('input', () => {
          const value = Number.parseInt(year.value, 10);
          row.year = Number.isFinite(value) ? value : null;
          changed();
        });

        const date = document.createElement('div');
        date.className = 'photo-date';
        date.append(month, year);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'photo-remove';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove photo ${number}`);
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(row.thumb);
          rows = rows.filter((other) => other !== row);
          const removedLastSaved = saved && rows.length === 0;
          changed();
          render();
          addButton.focus();
          // Removing every saved photo takes the photos off the gift link.
          if (removedLastSaved && hasSavedPhotos()) {
            onSaved('');
            saved = false;
            say('The photos were taken off this gift link. The old link still shows them until they are deleted after 30 days.');
            refresh();
          }
        });

        item.append(thumb, date, remove);
        return item;
      }),
    );
    refresh();
  };

  addButton.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    adding = true;
    refresh();
    let unreadable = 0;
    let skipped = 0;
    for (const file of files) {
      if (rows.length >= ALBUM_SIZE) {
        skipped++;
        continue;
      }
      if (await canReadPhoto(file)) {
        rows.push({ file, thumb: URL.createObjectURL(file), month: null, year: null });
      } else {
        unreadable++;
      }
    }
    adding = false;
    changed();
    render();
    if (unreadable > 0) say('Some photos could not be read. Please choose JPEG or PNG photos.');
    else if (skipped > 0) say(`A book holds up to ${ALBUM_SIZE} photos. The first ones were added.`);
    else say('Add the year of each photo, then save.');
  });

  sampleButton.addEventListener('click', async () => {
    adding = true;
    refresh();
    let added = 0;
    let failed = 0;
    for (const photo of demoAlbum) {
      if (rows.length >= ALBUM_SIZE) break;
      // Trying again only fills in the sample photos that are still missing.
      if (rows.some((row) => row.sample === photo.src)) continue;
      try {
        const response = await fetch(photo.src);
        if (!response.ok) throw new Error(`The sample photo answered ${response.status}.`);
        const blob = await response.blob();
        const file = new File([blob], photo.src.slice(photo.src.lastIndexOf('/') + 1), { type: 'image/jpeg' });
        const { month, year } = readDateLabel(photo.date);
        rows.push({ file, thumb: URL.createObjectURL(file), month, year, sample: photo.src });
        added++;
      } catch (error) {
        console.warn(error);
        failed++;
      }
    }
    adding = false;
    changed();
    render();
    if (!saveButton.hidden) saveButton.focus();
    if (failed > 0) say('Some sample photos could not be loaded. Please try again.');
    else
      say(
        `${added === 1 ? '1 sample photo was' : `${added} sample photos were`} added: AI generated pictures of the fictional Grace and Henry. Press Save photos to put them in this gift.`,
      );
  });

  saveButton.addEventListener('click', async () => {
    if (rows.length > ALBUM_SIZE) rows = rows.slice(0, ALBUM_SIZE);
    const missing = rows.findIndex((row) => row.year === null || row.year < FIRST_YEAR || row.year > lastYear);
    if (missing >= 0) {
      say(`Please add the year of photo ${missing + 1}.`);
      return;
    }
    saving = true;
    refresh();
    try {
      const id = await saveGiftPhotos(
        rows.map((row) => ({ file: row.file, date: dateLabel(row.month, row.year as number) })),
        (saved, total) => say(saved < total ? `Saving photo ${saved + 1} of ${total}…` : 'Photos saved.'),
      );
      onSaved(id);
      saved = true;
      say("Photos saved. This page's address is now the gift link, with the photos.");
    } catch (error) {
      console.warn(error);
      say('The photos could not be saved. Please try again.');
    } finally {
      saving = false;
      refresh();
    }
  });

  if (hasSavedPhotos()) say('This gift link already has its photos. Saving new photos replaces them.');
  else say('');
  render();
}
