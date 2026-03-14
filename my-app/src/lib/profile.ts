"use server";

import { supabase } from "./supabase";

const TABLE = "profiles";

// CREATE PROFILE
export async function createProfile(payload) {
  const { data, error } = await supabase.from(TABLE).insert([payload]).select();
  if (error) throw error;
  return data;
}

// GET PROFILE BY EMAIL
export async function getProfileByEmail(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw error;
  }
  return data;
}

// UPDATE PROFILE
export async function updateProfile(email, updates) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq("email", email)
    .select();

  const updated = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  console.log("Row after update:", updated.data);

  if (error) throw error;
  return data;
}

// DELETE PROFILE
export async function deleteProfile(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("email", email);

  if (error) throw error;
  return data;
}
