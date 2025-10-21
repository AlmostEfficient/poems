import { createPoemId } from '../utils/poemId';
import { Poem } from '../types';

const basePoems: Array<Omit<Poem, 'id'>> = [
  {
    title: 'Still I Rise',
    author: 'Maya Angelou',
    content: `You may write me down in history\nWith your bitter, twisted lies,\nYou may trod me in the very dirt\nBut still, like dust, I rise.\n\nDoes my sassiness upset you?\nWhy are you beset with gloom?\n'Cause I walk like I've got oil wells\nPumping in my living room.\n\nJust like moons and like suns,\nWith the certainty of tides,\nJust like hopes springing high,\nStill I'll rise.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'The Road Not Taken',
    author: 'Robert Frost',
    content: `Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever be back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'If—',
    author: 'Rudyard Kipling',
    content: `If you can keep your head when all about you\nAre losing theirs and blaming it on you,\nIf you can trust yourself when all men doubt you,\nBut make allowance for their doubting too;\nIf you can wait and not be tired by waiting,\nOr being lied about, don't deal in lies,\nOr being hated, don't give way to hating,\nAnd yet don't look too good, nor talk too wise:\n\nIf you can dream—and not make dreams your master;\nIf you can think—and not make thoughts your aim;\nIf you can meet with Triumph and Disaster\nAnd treat those two impostors just the same;\nIf you can bear to hear the truth you've spoken\nTwisted by knaves to make a trap for fools,\nOr watch the things you gave your life to, broken,\nAnd stoop and build 'em up with worn-out tools:\n\nIf you can make one heap of all your winnings\nAnd risk it on one turn of pitch-and-toss,\nAnd lose, and start again at your beginnings\nAnd never breathe a word about your loss;\nIf you can force your heart and nerve and sinew\nTo serve your turn long after they are gone,\nAnd so hold on when there is nothing in you\nExcept the Will which says to them: 'Hold on!'\n\nIf you can talk with crowds and keep your virtue,\nOr walk with Kings—nor lose the common touch,\nIf neither foes nor loving friends can hurt you,\nIf all men count with you, but none too much;\nIf you can fill the unforgiving minute\nWith sixty seconds' worth of distance run,\nYours is the Earth and everything that's in it,\nAnd—which is more—you'll be a Man, my son!`,
    source: 'bundled',
    language: 'en',
  },
  {
    title: 'Invictus',
    author: 'William Ernest Henley',
    content: `Out of the night that covers me,\n      Black as the pit from pole to pole,\nI thank whatever gods may be\n      For my unconquerable soul.\n\nIn the fell clutch of circumstance\n      I have not winced nor cried aloud.\nUnder the bludgeonings of chance\n      My head is bloody, but unbowed.\n\nBeyond this place of wrath and tears\n      Looms but the Horror of the shade,\nAnd yet the menace of the years\n      Finds and shall find me unafraid.\n\nIt matters not how strait the gate,\n      How charged with punishments the scroll,\nI am the master of my fate,\n      I am the captain of my soul.`,
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
];

export const STARTER_POEMS: Poem[] = basePoems.map((poem) => ({
  ...poem,
  id: createPoemId(poem),
}));

const FEATURED_TITLES = ['Still I Rise', 'The Road Not Taken', 'If—', 'Invictus'];

export const FEATURED_STARTER_IDS: string[] = FEATURED_TITLES.map((title) =>
  STARTER_POEMS.find((poem) => poem.title === title)?.id
).filter((id): id is string => Boolean(id));
