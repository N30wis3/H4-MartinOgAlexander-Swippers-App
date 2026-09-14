// src/lib/lookups.ts
import { supabase } from './supabase';

export type LookupOption = { id: number; label: string };

export type Lookups = {
  genders: LookupOption[];
  hoejde: LookupOption[]; // height brackets
  vaegt: LookupOption[]; // weight brackets
  aldersgruppe: LookupOption[]; // age brackets
  kampsport: LookupOption[];
};

function bracketLabel(min: number, max: number) {
  return `${min}–${max}`;
}

export async function fetchLookups(): Promise<Lookups> {
  const [genderRes, hoejdeRes, vaegtRes, aldersgruppeRes, kampsportRes] = await Promise.all([
    supabase.from('gender_type').select('id, gender').order('id'),
    supabase.from('hoejde').select('id, min, max').order('id'),
    supabase.from('vaegt').select('id, min, max').order('id'),
    supabase.from('aldersgruppe').select('id, min, max').order('id'),
    supabase.from('kampsport').select('id, kampsport').order('id'),
  ]);

  for (const res of [genderRes, hoejdeRes, vaegtRes, aldersgruppeRes, kampsportRes]) {
    if (res.error) throw res.error;
  }

  return {
    genders: genderRes.data!.map((r) => ({ id: r.id, label: r.gender })),
    hoejde: hoejdeRes.data!.map((r) => ({ id: r.id, label: bracketLabel(r.min, r.max) + ' cm' })),
    vaegt: vaegtRes.data!.map((r) => ({ id: r.id, label: bracketLabel(r.min, r.max) + ' kg' })),
    aldersgruppe: aldersgruppeRes.data!.map((r) => ({ id: r.id, label: bracketLabel(r.min, r.max) })),
    kampsport: kampsportRes.data!.map((r) => ({ id: r.id, label: r.kampsport })),
  };
}
