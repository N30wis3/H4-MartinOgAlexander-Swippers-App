// Simulated replies so the chat feels alive in the concept. In production this
// file goes away: replies come from the other user through the backend.

import type { Profile } from './types';

const TIME_REPLIES = [
  "I'm free Thursday evening or Saturday morning. Which works for you?",
  'Weekday evenings after 18:00 are best for me.',
  'Saturday around 10:00 sounds good!',
];

const PLACE_REPLIES = (city: string) => [
  `I usually train in ${city}. Happy to meet at a gym there, or you pick.`,
  'A gym with a proper ring or mats would be ideal. Know one nearby?',
  "There's a good club close to me. I can send the address.",
];

const INTENSITY_REPLIES = [
  "Let's start light and build up. Technical rounds first.",
  'Light to medium is perfect. Headgear and mouthguard on.',
  'I like controlled rounds, 3 minutes each. Sound good?',
];

const GENERIC_REPLIES = [
  'Sounds great! Looking forward to it 🥊',
  'Nice, count me in.',
  "Haha, deal. Can't wait to train with you.",
  "Perfect. Let's lock in a time.",
];

// `random` is injectable so tests can make the choice deterministic.
export function pickReply(text: string, partner: Profile, random: () => number = Math.random): string {
  const lower = text.toLowerCase();

  let pool = GENERIC_REPLIES;
  if (/\b(when|time|free|today|tomorrow|weekend|evening|morning)\b/.test(lower)) pool = TIME_REPLIES;
  else if (/\b(where|gym|club|place|address)\b/.test(lower)) pool = PLACE_REPLIES(partner.location.city);
  else if (/\b(light|hard|intensity|technical|sparring|rounds?)\b/.test(lower)) pool = INTENSITY_REPLIES;

  return pool[Math.floor(random() * pool.length) % pool.length];
}

export const QUICK_REPLIES = ['When are you free?', 'Which gym works?', 'Light sparring?'];
