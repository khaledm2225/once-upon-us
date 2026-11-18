import { ALBUM_SIZE, MONTHS, dateLabel } from '../story/album.js';
import { canReadPhoto, saveGiftPhotos } from '../story/gift-photos.js';

// The family photos on the start page: up to 10 photos, each with its month
// (optional) and year. "Save photos" sends them to the server as one new set,
// and its id joins the gift link. Until then nothing leaves the device.

interface Row {
  file: File;
  thumb: string;
  month: number | null;
  year: number | null;
}

const FIRST_YEAR = 1850;

export function setupPhotoPicker(hasSavedPhotos: () => boolean, onSaved: (id: string) => void): void {
  const list = document.getElementById('photo-list') as HTMLUListElement;
  const input = document.getElementById('photo-input') as HTMLInputElement;
  const addButton = document.getElementById('add-photos') as HTMLButtonElement;
  const saveButton = document.getElementById('save-photos') as HTMLButtonElement;
  const status = document.getElementById('photo-status') as HTMLElement;
  const lastYear = new Date().getFullYear();

  let rows: Row[] = [];
  let saving = false;

  const say = (text: string) => {
    status.textContent = text;
    status.hidden = text === '';
  };

  const refresh = () => {
    addButton.disabled = saving || rows.length >= ALBUM_SIZE;
    saveButton.hidden = rows.length === 0;
    saveButton.disabled = saving;
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
          say('');
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
          say('');
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
          say('');
          render();
          addButton.focus();
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
    const room = ALBUM_SIZE - rows.length;
    let unreadable = 0;
    for (const file of files.slice(0, room)) {
      if (await canReadPhoto(file)) {
        rows.push({ file, thumb: URL.createObjectURL(file), month: null, year: null });
      } else {
        unreadable++;
      }
    }
    render();
    if (unreadable > 0) say('Some photos could not be read. Please choose JPEG or PNG photos.');
    else if (files.length > room) say(`A book holds up to ${ALBUM_SIZE} photos. The first ones were added.`);
    else say('Add the year of each photo, then save.');
  });

  saveButton.addEventListener('click', async () => {
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
      say("Photos saved. This page's address is now the gift link, with the photos.");
    } catch (error) {
      console.warn(error);
      say('The photos could not be saved. Please try again.');
    } finally {
      saving = false;
      refresh();
    }
  });

  if (hasSavedPhotos()) say('This gift link already has its photos.');
  else say('');
  render();
}
