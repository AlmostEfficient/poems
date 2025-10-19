import { createPoemId } from '../utils/poemId';
import { Poem } from '../types';

const basePoems: Array<Omit<Poem, 'id'>> = [
  {
    title: 'The Road Not Taken',
    author: 'Robert Frost',
    content: `Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever be back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'Fire and Ice',
    author: 'Robert Frost',
    content: `Some say the world will end in fire,\nSome say in ice.\nFrom what I've tasted of desire\nI hold with those who favor fire.\nBut if it had to perish twice,\nI think I know enough of hate\nTo say that for destruction ice\nIs also great\nAnd would suffice.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'Stopping by Woods on a Snowy Evening',
    author: 'Robert Frost',
    content: `Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.\n\nMy little horse must think it queer\nTo stop without a farmhouse near\nBetween the woods and frozen lake\nThe darkest evening of the year.\n\nHe gives his harness bells a shake\nTo ask if there is some mistake.\nThe only other sound's the sweep\nOf easy wind and downy flake.\n\nThe woods are lovely, dark and deep,\nBut I have promises to keep,\nAnd miles to go before I sleep,\nAnd miles to go before I sleep.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'Nothing Gold Can Stay',
    author: 'Robert Frost',
    content: `Nature's first green is gold,\nHer hardest hue to hold.\nHer early leaf's a flower;\nBut only so an hour.\nThen leaf subsides to leaf.\nSo Eden sank to grief,\nSo dawn goes down to day.\nNothing gold can stay.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'The Guest House',
    author: 'Rumi',
    content: `This being human is a guest house.\nEvery morning a new arrival.\n\nA joy, a depression, a meanness,\nsome momentary awareness comes\nas an unexpected visitor.\n\nWelcome and entertain them all!\nEven if they're a crowd of sorrows,\nwho violently sweep your house\nempty of its furniture,\nstill, treat each guest honorably.\nHe may be clearing you out\nfor some new delight.\n\nThe dark thought, the shame, the malice,\nmeet them at the door laughing,\nand invite them in.\n\nBe grateful for whoever comes,\nbecause each has been sent\nas a guide from beyond.`,
    source: 'bundled',
    language: 'en',
  },
];

export const STARTER_POEMS: Poem[] = basePoems.map((poem) => ({
  ...poem,
  id: createPoemId(poem),
}));
