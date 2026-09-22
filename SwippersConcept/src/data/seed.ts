// Mock fighters used as the pool of swipeable profiles. In production these
// rows come from the backend; the rest of the app only sees SeedProfile.

import { CITIES } from '@/domain/geo';
import type { Level, SeedProfile, Sport } from '@/domain/types';

function at(city: string, dLat = 0, dLon = 0) {
  const base = CITIES.find((c) => c.city === city)!;
  // A small offset (~1 degree ≈ 111 km) spreads people around the city.
  return { city, lat: base.lat + dLat, lon: base.lon + dLon };
}

interface Row {
  id: string;
  name: string;
  bio: string;
  level: Level;
  sports: Sport[];
  h: string;
  w: string;
  a: string;
  loc: ReturnType<typeof at>;
  likesYou: boolean;
  sparrings: Partial<Record<Sport, number>>;
}

const ROWS: Row[] = [
  { id: 'p01', name: 'Mikkel Jensen', bio: 'Boxing for 6 years. Love technical rounds and pad work.', level: 'Advanced', sports: ['Boxing'], h: 'h3', w: 'w3', a: 'a2', loc: at('Copenhagen', 0.01, 0.02), likesYou: true, sparrings: { Boxing: 34 } },
  { id: 'p02', name: 'Sofie Andersen', bio: 'Judoka looking for randori partners who like throws.', level: 'Advanced', sports: ['Judo', 'BJJ'], h: 'h2', w: 'w2', a: 'a2', loc: at('Copenhagen', -0.02, 0.05), likesYou: true, sparrings: { Judo: 21, BJJ: 9 } },
  { id: 'p03', name: 'Jonas Krogh', bio: 'MMA amateur, 4 fights. Light to medium sparring only.', level: 'Competitor', sports: ['MMA', 'Kickboxing'], h: 'h4', w: 'w4', a: 'a3', loc: at('Roskilde', 0.01, 0), likesYou: false, sparrings: { MMA: 27, Kickboxing: 11 } },
  { id: 'p04', name: 'Emma Holm', bio: 'New to boxing, super motivated. Patient partners please!', level: 'Beginner', sports: ['Boxing'], h: 'h2', w: 'w2', a: 'a1', loc: at('Copenhagen', 0.03, -0.04), likesYou: true, sparrings: { Boxing: 3 } },
  { id: 'p05', name: 'Lukas Bruun', bio: 'Wrestling background. I take you down, then we shake hands.', level: 'Intermediate', sports: ['Wrestling', 'MMA'], h: 'h3', w: 'w4', a: 'a2', loc: at('Copenhagen', -0.04, -0.03), likesYou: false, sparrings: { Wrestling: 15, MMA: 6 } },
  { id: 'p06', name: 'Freja Nielsen', bio: 'Muay Thai fan. Clinch work, low kicks, good vibes.', level: 'Intermediate', sports: ['Muay Thai', 'Kickboxing'], h: 'h2', w: 'w2', a: 'a3', loc: at('Copenhagen', 0.05, 0.06), likesYou: true, sparrings: { 'Muay Thai': 16, Kickboxing: 5 } },
  { id: 'p07', name: 'Oliver Madsen', bio: 'Heavy hitter, gentle soul. Looking for heavier partners.', level: 'Intermediate', sports: ['Boxing', 'Kickboxing'], h: 'h5', w: 'w6', a: 'a3', loc: at('Copenhagen', 0.08, -0.06), likesYou: false, sparrings: { Boxing: 12, Kickboxing: 8 } },
  { id: 'p08', name: 'Ida Pedersen', bio: 'BJJ blue belt. Rolling is life. Open mat anytime.', level: 'Intermediate', sports: ['BJJ'], h: 'h2', w: 'w2', a: 'a2', loc: at('Copenhagen', -0.06, 0.02), likesYou: true, sparrings: { BJJ: 24 } },
  { id: 'p09', name: 'Noah Sørensen', bio: 'Karate kumite, WKF style. Fast hands, light contact.', level: 'Advanced', sports: ['Karate'], h: 'h3', w: 'w3', a: 'a1', loc: at('Roskilde', -0.02, 0.03), likesYou: false, sparrings: { Karate: 19 } },
  { id: 'p10', name: 'Astrid Lund', bio: 'Kickboxing coach. Happy to spar with newcomers.', level: 'Competitor', sports: ['Kickboxing', 'Boxing'], h: 'h3', w: 'w3', a: 'a4', loc: at('Copenhagen', 0.02, 0.09), likesYou: true, sparrings: { Kickboxing: 42, Boxing: 8 } },
  { id: 'p11', name: 'Viktor Møller', bio: 'Ex-wrestler, now doing MMA for fun. Cardio monster.', level: 'Advanced', sports: ['MMA', 'Wrestling'], h: 'h4', w: 'w5', a: 'a3', loc: at('Aarhus', 0.02, 0.01), likesYou: true, sparrings: { MMA: 29, Wrestling: 18 } },
  { id: 'p12', name: 'Clara Winther', bio: 'Boxing and strength training. Two rounds, coffee after.', level: 'Beginner', sports: ['Boxing'], h: 'h2', w: 'w1', a: 'a2', loc: at('Aarhus', -0.03, -0.02), likesYou: false, sparrings: { Boxing: 4 } },
  { id: 'p13', name: 'Emil Rasmussen', bio: 'Judo brown belt, 12 years. Kata nerd, randori beast.', level: 'Advanced', sports: ['Judo'], h: 'h3', w: 'w4', a: 'a4', loc: at('Aarhus', 0.04, 0.05), likesYou: true, sparrings: { Judo: 37 } },
  { id: 'p14', name: 'Nanna Thomsen', bio: 'Muay Thai and boxing. Looking for a regular partner.', level: 'Intermediate', sports: ['Muay Thai', 'Boxing'], h: 'h2', w: 'w2', a: 'a2', loc: at('Aarhus', -0.05, 0.04), likesYou: false, sparrings: { 'Muay Thai': 13, Boxing: 7 } },
  { id: 'p15', name: 'Anton Vestergaard', bio: 'BJJ purple belt. No-gi and gi, I do both.', level: 'Advanced', sports: ['BJJ', 'MMA'], h: 'h4', w: 'w4', a: 'a3', loc: at('Aarhus', 0.06, -0.03), likesYou: true, sparrings: { BJJ: 31, MMA: 5 } },
  { id: 'p16', name: 'Maja Kristensen', bio: 'Karate black belt teaching kids by day, sparring by night.', level: 'Advanced', sports: ['Karate', 'Kickboxing'], h: 'h2', w: 'w2', a: 'a3', loc: at('Odense', 0.01, 0.02), likesYou: false, sparrings: { Karate: 23, Kickboxing: 6 } },
  { id: 'p17', name: 'Casper Dahl', bio: 'Boxing gym rat. Sparring Tuesdays and Thursdays.', level: 'Intermediate', sports: ['Boxing'], h: 'h4', w: 'w4', a: 'a2', loc: at('Odense', -0.02, -0.03), likesYou: true, sparrings: { Boxing: 14 } },
  { id: 'p18', name: 'Line Hansen', bio: 'Wrestling and judo. I like to keep it playful.', level: 'Intermediate', sports: ['Wrestling', 'Judo'], h: 'h2', w: 'w3', a: 'a3', loc: at('Odense', 0.04, 0.01), likesYou: true, sparrings: { Wrestling: 10, Judo: 9 } },
  { id: 'p19', name: 'Rasmus Poulsen', bio: 'MMA coach and former pro. Ask me about grappling.', level: 'Competitor', sports: ['MMA', 'BJJ'], h: 'h5', w: 'w5', a: 'a4', loc: at('Aalborg', 0.01, 0.03), likesYou: false, sparrings: { MMA: 48, BJJ: 22 } },
  { id: 'p20', name: 'Sara Christensen', bio: 'Kickboxing amateur. Looking for fast, technical rounds.', level: 'Intermediate', sports: ['Kickboxing'], h: 'h3', w: 'w2', a: 'a1', loc: at('Aalborg', -0.02, -0.02), likesYou: true, sparrings: { Kickboxing: 17 } },
  { id: 'p21', name: 'Mads Olsen', bio: 'Just started Muay Thai after years of football.', level: 'Beginner', sports: ['Muay Thai'], h: 'h4', w: 'w4', a: 'a1', loc: at('Copenhagen', -0.08, 0.07), likesYou: true, sparrings: { 'Muay Thai': 2 } },
  { id: 'p22', name: 'Julie Bech', bio: 'Boxing and BJJ. Always up for a friendly round.', level: 'Intermediate', sports: ['Boxing', 'BJJ'], h: 'h2', w: 'w2', a: 'a2', loc: at('Copenhagen', 0.06, -0.01), likesYou: false, sparrings: { Boxing: 11, BJJ: 12 } },
  { id: 'p23', name: 'Tobias Friis', bio: 'Judo and wrestling. Ippon or nothing.', level: 'Advanced', sports: ['Judo', 'Wrestling'], h: 'h4', w: 'w5', a: 'a3', loc: at('Kolding', 0.01, 0.01), likesYou: true, sparrings: { Judo: 26, Wrestling: 14 } },
  { id: 'p24', name: 'Karla Ibsen', bio: 'Karate and kickboxing. Precision over power.', level: 'Advanced', sports: ['Karate', 'Kickboxing'], h: 'h3', w: 'w3', a: 'a2', loc: at('Esbjerg', 0, 0.02), likesYou: false, sparrings: { Karate: 20, Kickboxing: 15 } },
];

export const SEED_PROFILES: SeedProfile[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  bio: r.bio,
  level: r.level,
  sports: r.sports,
  heightClassId: r.h,
  weightClassId: r.w,
  ageGroupId: r.a,
  location: r.loc,
  likesYou: r.likesYou,
  sparrings: r.sparrings,
}));

export function findSeedProfile(id: string): SeedProfile | undefined {
  return SEED_PROFILES.find((p) => p.id === id);
}
