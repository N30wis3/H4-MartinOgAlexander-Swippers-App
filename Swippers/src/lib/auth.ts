// src/lib/auth.ts
import { supabase } from './supabase';

export async function registerUser({
  email,
  password,
  username,
  fornavn,
  efternavn,
  description,
}: {
  email: string;
  password: string;
  username: string;
  fornavn: string;
  efternavn: string;
  description?: string;
}) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Signup succeeded but no user was returned.');

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    username,
    fornavn,
    efternavn,
    description: description ?? null,
  });

  if (profileError) throw profileError;

  return authData.user;
}

export async function upsertUserConfig({
  userId,
  genderId,
  seekingGenderId,
  hoejdeId,
  vaegtId,
  aldersgruppeId,
  longitude,
  latitude,
  searchRadius,
}: {
  userId: string;
  genderId?: number;
  seekingGenderId?: number;
  hoejdeId?: number;
  vaegtId?: number;
  aldersgruppeId?: number;
  longitude?: number;
  latitude?: number;
  searchRadius?: number;
}) {
  const { error } = await supabase.from('user_config').upsert({
    user_id: userId,
    gender_id: genderId,
    seeking_gender_id: seekingGenderId,
    hoejde_id: hoejdeId,
    vaegt_id: vaegtId,
    aldersgruppe_id: aldersgruppeId,
    longitude,
    latitude,
    search_radius: searchRadius,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_config')
    .select('is_complete')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.is_complete ?? false;
}
