// The story of Once Upon Us. This is the only file with story text.
// Edit the words here; the book repaints itself from this data.

export const story = {
  cover: {
    title: 'Once Upon Us',
    name1: 'Grace',
    name2: 'Henry',
    namesJoin: ' & ', // printed as "Grace & Henry"
  },
  pages: [
    {
      id: 'first-meeting',
      label: 'The first meeting', // for editing only, not printed
      scene: 'a bus stop in the rain, two small figures, one shared umbrella', // for editing only
      text: [
        'One rainy morning, a shared umbrella at the bus stop.',
        'He missed his bus on purpose.',
      ],
    },
    {
      id: 'wedding',
      label: 'The wedding',
      scene: 'a small celebration under a string of lights, the couple in the middle',
      text: [
        'Under a string of small lights, with everyone they loved,',
        'they promised each other forever.',
      ],
    },
    {
      id: 'first-home',
      label: 'The first home',
      scene: 'a small house at night, one warm lit window',
      text: ['One small room, one lit window,', 'and a kettle always warm for two.'],
    },
    {
      id: 'busy-years',
      label: 'The busy years',
      scene: 'a dinner table with many chairs, small and big',
      text: [
        'Then came more chairs around the table.',
        'Full plates, loud dinners and laughter every night.',
      ],
    },
    {
      id: 'today',
      label: 'Today',
      scene: 'the two of them on a bench, holding hands, watching the sunset',
      text: [
        'Years later, the same hands and the same sunset.',
        'Still choosing each other, every single day.',
      ],
    },
  ],
  dedication: [
    'To Grandma Grace and Grandpa Henry.',
    'Thank you for showing us what love looks like.',
    'With love, your grandchildren.',
  ],
} as const;

export function coverNamesLine(name1: string, name2: string): string {
  return `${name1}${story.cover.namesJoin}${name2}`;
}
