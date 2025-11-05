"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/types/database.types";

export type Profile = Tables<"profiles">;
export type ProfileWithManager = Profile & {
  manager: Profile | null;
};
export type ProfileWithReports = Profile & {
  direct_reports: Profile[];
};

/**
 * Sync manager relationships from employees table to profiles.manager_id
 * This should be called after running sync_employees_from_fdw()
 */
export async function syncManagerRelationships() {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("sync_manager_relationships");

  if (error) {
    throw new Error(`Failed to sync manager relationships: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get a user's direct manager
 */
export async function getManager(userId: string): Promise<Profile | null> {
  const { supabase } = await requireUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", userId)
    .single();

  if (error || !profile?.manager_id) {
    return null;
  }

  const { data: manager, error: managerError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profile.manager_id)
    .single();

  if (managerError) {
    return null;
  }

  return manager;
}

/**
 * Get a user's direct reports (people who report to them)
 */
export async function getDirectReports(
  userId: string
): Promise<Profile[]> {
  const { supabase } = await requireUser();

  const { data: reports, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", userId)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    throw new Error(`Failed to get direct reports: ${error.message}`);
  }

  return reports || [];
}

/**
 * Get a user's profile with their manager information
 */
export async function getProfileWithManager(
  userId: string
): Promise<ProfileWithManager> {
  const { supabase } = await requireUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      manager:manager_id (*)
    `
    )
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to get profile with manager: ${error.message}`);
  }

  return profile as ProfileWithManager;
}

/**
 * Get a user's profile with their direct reports
 */
export async function getProfileWithReports(
  userId: string
): Promise<ProfileWithReports> {
  const { supabase } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw new Error(`Failed to get profile: ${profileError.message}`);
  }

  const { data: reports, error: reportsError } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", userId)
    .eq("is_active", true)
    .order("full_name");

  if (reportsError) {
    throw new Error(`Failed to get direct reports: ${reportsError.message}`);
  }

  return {
    ...profile,
    direct_reports: reports || [],
  };
}

/**
 * Check if user1 is the manager of user2
 */
export async function isManager(
  managerId: string,
  reportId: string
): Promise<boolean> {
  const { supabase } = await requireUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", reportId)
    .single();

  if (error || !profile) {
    return false;
  }

  return profile.manager_id === managerId;
}

/**
 * Get the entire reporting chain for a user (all managers up the hierarchy)
 */
export async function getManagerChain(
  userId: string
): Promise<Profile[]> {
  const { supabase } = await requireUser();

  const chain: Profile[] = [];
  let currentUserId = userId;
  const visited = new Set<string>(); // Prevent infinite loops

  while (currentUserId && !visited.has(currentUserId)) {
    visited.add(currentUserId);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .single();

    if (error || !profile || !profile.manager_id) {
      break;
    }

    const { data: manager, error: managerError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.manager_id)
      .single();

    if (managerError || !manager) {
      break;
    }

    chain.push(manager);
    currentUserId = manager.id;
  }

  return chain;
}

/**
 * Get all reports recursively (direct reports and their reports, etc.)
 */
export async function getAllReportsRecursive(
  userId: string
): Promise<Profile[]> {
  const { supabase } = await requireUser();

  const allReports: Profile[] = [];
  const visited = new Set<string>();

  async function getReportsRecursively(managerId: string) {
    if (visited.has(managerId)) {
      return; // Prevent infinite loops
    }
    visited.add(managerId);

    const { data: reports, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("manager_id", managerId)
      .eq("is_active", true);

    if (error || !reports) {
      return;
    }

    for (const report of reports) {
      allReports.push(report);
      await getReportsRecursively(report.id);
    }
  }

  await getReportsRecursively(userId);

  return allReports;
}
