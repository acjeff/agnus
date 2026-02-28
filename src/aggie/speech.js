// Aggie speech/dialogue data and interaction constants
// Extracted from Pattrn.jsx

const COMPANION_CELEBRATE_LINES = [
  "Nailed it!", "You did it!", "Amazing!", "Woohoo!", "So smart!",
  "Big brain!", "Genius!", "Crushed it!", "Perfect!", "Yay!",
  "GG!", "Let's go!", "Too easy!", "Flawless!", "Wowza!",
];
const COMPANION_SAD_LINES = [
  "Oof...", "So close!", "Next time!", "Aww...", "Don't give up!",
  "Try again!", "Almost!", "Nooo!", "Unlucky...", "You got this!",
  "Believe!", "Keep going!", "Hmph...", "It's okay!", "We go again!",
];

// Aggie contextual speech lines — triggered sporadically during gameplay
const AGGIE_PLACE_LINES = [
  "Hmm...", "Interesting...", "Ooh!", "Bold move", "I see...",
  "Nice pick", "Go on...", "Okay okay", "Huh!", "Smooth",
];
const AGGIE_REMOVE_LINES = [
  "Changed your mind?", "Hmm, rethinking?", "Second thoughts...", "Take your time",
  "No rush", "Try something else?",
];
const AGGIE_WRONG_LINES = [
  "Not quite...", "Close!", "Almost there", "Hmm, check again",
  "Keep trying!", "So close...", "Look carefully...", "Don't give up",
];
const AGGIE_HINT_GOOD = [
  "That feels right", "Good instinct", "I like that one", "Looks good to me",
  "Yeah...", "Mhm!", "Nice.",
];
const AGGIE_HINT_BAD = [
  "Hmm, you sure?", "I dunno about that...", "Maybe not...", "Ehhh...",
  "Think about it...", "Something's off...", "Look around more...",
];
const AGGIE_MENU_LINES = [
  "Whatcha looking for?", "Need something?", "Browsing?", "Taking a break?",
  "Ooh, settings", "What's in here...",
];
const AGGIE_IDLE_LINES = [
  "...", "*yawn*", "Hmm...", "*stretch*", "..zzz", "Boo!",
  "Still thinking?", "You got this", "I believe in you",
];

// --- Happiness-based speech lines (Tamagotchi mood system) ---
// Grumpy lines — sarcastic, unhelpful (happiness 20-39)
const AGGIE_GRUMPY_IDLE = [
  "Whatever...", "*sighs loudly*", "Are you done yet?", "I'm bored",
  "Feed me coins", "Remember me?", "So neglected...", "Hmph.",
  "Don't mind me", "I'm fine. Really.", "*cold stare*",
];
const AGGIE_GRUMPY_HINT_GOOD = [
  "Probably wrong", "I guess...", "If you say so", "Meh",
  "Sure, why not", "Don't ask me", "I wouldn't trust it",
];
const AGGIE_GRUMPY_HINT_BAD = [
  "Looks great to me!", "Perfect choice!", "Definitely that one", "Go for it!",
  "Can't go wrong!", "Trust your gut!", "Nailed it!",
];
const AGGIE_GRUMPY_CELEBRATE = [
  "Finally.", "Took long enough", "Lucky guess", "Even a broken clock...",
  "Don't let it go to your head", "Wow. You did it.", "About time",
];
const AGGIE_GRUMPY_SAD = [
  "Saw that coming", "Not surprised", "Classic.", "Expected.",
  "Ha.", "Told you", "Predictable",
];
const AGGIE_GRUMPY_PLACE = [
  "Bold...", "Your funeral", "Interesting choice...", "Oh really?",
  "Hm. Sure.", "If you insist",
];

// Miserable lines — very sarcastic, actively misleading (happiness 0-19)
const AGGIE_MISERABLE_IDLE = [
  "...", "*ignores you*", "Go away", "Why bother?",
  "I used to be happy", "Remember coins?", "So this is how it is",
  "*dramatic sigh*", "Leave me alone", "Unbelievable",
];
const AGGIE_MISERABLE_HINT_GOOD = [
  "Terrible idea!", "No no no!", "Anywhere but there", "Wrong!",
  "Have you tried quitting?", "Absolutely not",
];
const AGGIE_MISERABLE_HINT_BAD = [
  "PERFECT!", "Genius move!", "You're so smart!", "Definitely!",
  "Best choice ever!", "Trust me on this!",
];
const AGGIE_MISERABLE_CELEBRATE = [
  "...", "Whatever", "Fluke", "Don't care",
  "Wake me when it matters", "Yawn",
];
const AGGIE_MISERABLE_SAD = [
  "Good.", "Deserved.", "Ha ha ha.", "Shocking.",
  "*slow clap*", "Music to my ears",
];
// Debuff applied lines — what Aggie says when a debuff kicks in
const AGGIE_DEBUFF_LINES = {
  brain_fog: ["My head's all fuzzy...", "Can't think straight...", "Everything's blurry...", "Brain... fog...", "*confused noises*"],
  fumble: ["My paws are all tingly...", "Butterfingered!", "Dropped my coins...", "Clumsy day...", "Can't hold anything..."],
  bad_luck: ["Something feels off...", "The stars aren't aligned...", "Unlucky streak...", "Bad vibes...", "*shudders*"],
};

// Ecstatic lines — extra enthusiastic (happiness 90-100)
const AGGIE_ECSTATIC_IDLE = [
  "Best day ever!", "I love puzzles!", "You're the best!", "*happy dance*",
  "Life is good!", "So grateful!", "More puzzles please!", "*sparkles*",
];
const AGGIE_ECSTATIC_CELEBRATE = [
  "INCREDIBLE!!", "YOU'RE A GENIUS!", "WOOOOO!", "UNSTOPPABLE!",
  "LEGENDARY!", "I KNEW IT!", "PERFECTION!!", "CHAMPION!",
];

// Desire-related speech
const AGGIE_DESIRE_LINES = {
  puzzle: [
    "I really want you to solve {label}...", "Can we do {label}?",
    "Pleease solve {label}!", "I'd love {label} right now",
    "{label} would make my day!", "How about {label}?",
  ],
  item: [
    "I really want a {label}...", "Can I have a {label}?",
    "A {label} would be nice...", "I've been eyeing that {label}",
    "Buy me a {label}?", "*points at {label}*",
  ],
};

// Get mood-appropriate lines based on happiness
function getMoodLines(happinessMood, lineType) {
  if (happinessMood === "miserable") {
    switch (lineType) {
      case "idle": return AGGIE_MISERABLE_IDLE;
      case "hint_good": return AGGIE_MISERABLE_HINT_GOOD;
      case "hint_bad": return AGGIE_MISERABLE_HINT_BAD;
      case "celebrate": return AGGIE_MISERABLE_CELEBRATE;
      case "sad": return AGGIE_MISERABLE_SAD;
      case "place": return AGGIE_GRUMPY_PLACE;
      default: return AGGIE_MISERABLE_IDLE;
    }
  }
  if (happinessMood === "grumpy") {
    switch (lineType) {
      case "idle": return AGGIE_GRUMPY_IDLE;
      case "hint_good": return AGGIE_GRUMPY_HINT_GOOD;
      case "hint_bad": return AGGIE_GRUMPY_HINT_BAD;
      case "celebrate": return AGGIE_GRUMPY_CELEBRATE;
      case "sad": return AGGIE_GRUMPY_SAD;
      case "place": return AGGIE_GRUMPY_PLACE;
      default: return AGGIE_GRUMPY_IDLE;
    }
  }
  if (happinessMood === "ecstatic") {
    switch (lineType) {
      case "idle": return AGGIE_ECSTATIC_IDLE;
      case "celebrate": return AGGIE_ECSTATIC_CELEBRATE;
      default: return null; // fall through to normal
    }
  }
  return null; // use default lines
}

const IDLE_ACTIONS = ["stretch", "spin", "peek", "wiggle", "bounce", "yawn", "play-toy"];
const IDLE_ANIMS = {
  stretch: "aggieStretch 0.8s ease-in-out",
  spin: "aggieSpin 0.7s ease-in-out",
  peek: "aggiePeek 1s ease-in-out",
  wiggle: "aggieWiggle 0.6s ease-in-out",
  bounce: "aggieBounce 0.5s ease-in-out",
  yawn: "aggieYawn 1.2s ease-in-out",
  "play-toy": "aggiePlayToy 2.4s ease-in-out",
};
// Toy lines Aggie says when playing with her toy
const AGGIE_TOY_LINES = [
  "*plays with cube*", "Wheee!", "*boing boing*", "My favourite!",
  "*spins toy*", "Catch!", "*tosses cube*", "So shiny...",
  "*rolls toy around*", "Mine!", "Hehe!", "*poke poke*",
];

// --- Multiplayer Aggie Interactions ---
const AGGIE_INTERACTIONS = [
  { id: "wave", label: "Wave", emoji: "\u{1F44B}" },
  { id: "high-five", label: "High Five", emoji: "\u{1F64C}" },
  { id: "bump", label: "Bump", emoji: "\u{1F44A}" },
  { id: "dance", label: "Dance", emoji: "\u{1F483}" },
  { id: "nuzzle", label: "Nuzzle", emoji: "\u{1F970}" },
  { id: "boop", label: "Boop", emoji: "\u{1F446}" },
];
const AGGIE_INTERACTION_LINES = {
  "wave": ["Hey there!", "Hiii!", "*waves*", "Hello friend!"],
  "high-five": ["High five!", "Yeah!", "Wooo!", "*slap*"],
  "bump": ["*bump*", "Fist bump!", "Boop!", "Pow!"],
  "dance": ["*dances*", "Let's groove!", "Dance party!", "\u{1F483}\u{1F57A}"],
  "nuzzle": ["*nuzzle*", "Cozy...", "Snuggle!", "Warm..."],
  "boop": ["*boop*", "Boop!", "Got your nose!", "Hehe!"],
};
const AGGIE_INTERACTION_ANIMS = {
  "wave": "aggiePeek 1s ease-in-out",
  "high-five": "aggieBounce 0.5s ease-in-out",
  "bump": "aggieWiggle 0.6s ease-in-out",
  "dance": "aggieSpin 0.7s ease-in-out",
  "nuzzle": "aggieStretch 0.8s ease-in-out",
  "boop": "aggieBounce 0.5s ease-in-out",
};
const PEER_AGGIE_PROXIMITY = 120; // pixels — distance to show interaction menu

// --- Aggie Conversations (paired call-response lines for coop) ---
const AGGIE_CONVERSATIONS = [
  { prompt: "Hey...", response: "Hmm?" },
  { prompt: "You thinking what I'm thinking?", response: "Probably not!" },
  { prompt: "Psst!", response: "What??" },
  { prompt: "*poke*", response: "Hey! Stop that!" },
  { prompt: "This puzzle is tricky", response: "We got this!" },
  { prompt: "Nice move!", response: "Thanks!" },
  { prompt: "*stares*", response: "*stares back*" },
  { prompt: "I'm bored", response: "Focus!" },
  { prompt: "Wanna race?", response: "You're on!" },
  { prompt: "Are you stuck?", response: "No... maybe..." },
  { prompt: "I like your hat", response: "Why thank you" },
  { prompt: "Tag, you're it!", response: "No tag-backs!" },
  { prompt: "*whispers*", response: "*whispers back*" },
  { prompt: "Teamwork!", response: "Makes the dream work!" },
  { prompt: "Don't look at me", response: "Too late!" },
  { prompt: "Almost done?", response: "Getting there..." },
];

export {
  COMPANION_CELEBRATE_LINES,
  COMPANION_SAD_LINES,
  AGGIE_PLACE_LINES,
  AGGIE_REMOVE_LINES,
  AGGIE_WRONG_LINES,
  AGGIE_HINT_GOOD,
  AGGIE_HINT_BAD,
  AGGIE_MENU_LINES,
  AGGIE_IDLE_LINES,
  AGGIE_GRUMPY_IDLE,
  AGGIE_GRUMPY_HINT_GOOD,
  AGGIE_GRUMPY_HINT_BAD,
  AGGIE_GRUMPY_CELEBRATE,
  AGGIE_GRUMPY_SAD,
  AGGIE_GRUMPY_PLACE,
  AGGIE_MISERABLE_IDLE,
  AGGIE_MISERABLE_HINT_GOOD,
  AGGIE_MISERABLE_HINT_BAD,
  AGGIE_MISERABLE_CELEBRATE,
  AGGIE_MISERABLE_SAD,
  AGGIE_DEBUFF_LINES,
  AGGIE_ECSTATIC_IDLE,
  AGGIE_ECSTATIC_CELEBRATE,
  AGGIE_DESIRE_LINES,
  getMoodLines,
  IDLE_ACTIONS,
  IDLE_ANIMS,
  AGGIE_TOY_LINES,
  AGGIE_INTERACTIONS,
  AGGIE_INTERACTION_LINES,
  AGGIE_INTERACTION_ANIMS,
  PEER_AGGIE_PROXIMITY,
  AGGIE_CONVERSATIONS,
};
