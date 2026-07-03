import { getDb } from "@/lib/db/client";
import type { VoiceProfile } from "@/lib/schemas/voice-profile";

export async function saveVoiceProfile(profile: VoiceProfile): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("voice_profiles")
    .insert({ dimensions_json: profile })
    .select("id")
    .single();
  if (error) {
    console.error("[voice_profiles] insert failed:", error.message);
    return null;
  }
  return data.id as string;
}

export interface VoiceProfileRow {
  id: string;
  dimensions_json: VoiceProfile;
  created_at: string;
}

export async function listVoiceProfiles(limit = 50): Promise<VoiceProfileRow[]> {
  const db = getDb();
  if (!db) return [];
  const { data, error } = await db
    .from("voice_profiles")
    .select("id, dimensions_json, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[voice_profiles] list failed:", error.message);
    return [];
  }
  return data as VoiceProfileRow[];
}
