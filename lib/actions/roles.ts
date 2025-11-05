'use server'

/**
 * Role Server Actions
 * CRUD operations for roles with permission checks
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database.types'
import { isSystemAdmin } from '@/lib/auth/permissions'

type Role = Tables<'roles'>
type EmployeeRole = Tables<'employee_roles'>
type Profile = Tables<'profiles'>

export interface RoleWithDetails extends Role {
  accountable_to_role: Role | null
  employee_count: number
}

export interface RoleWithMembers extends Role {
  accountable_to_role: Role | null
  members: (EmployeeRole & { profile: Profile })[]
}

/**
 * Get all roles with details (employee count, parent role)
 */
export async function getRoles(): Promise<{
  data: RoleWithDetails[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('display_order')

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return { data: null, error: 'Failed to fetch roles' }
    }

    if (!roles || roles.length === 0) {
      return { data: [], error: null }
    }

    // Get employee counts for each role
    const { data: roleCounts, error: countsError } = await supabase
      .from('employee_roles')
      .select('role_id')

    if (countsError) {
      console.error('Error fetching role counts:', countsError)
      // Continue without counts rather than failing completely
    }

    // Build a map of role_id -> count
    const countMap = new Map<string, number>()
    if (roleCounts) {
      roleCounts.forEach((er) => {
        countMap.set(er.role_id, (countMap.get(er.role_id) || 0) + 1)
      })
    }

    // Build a map of role_id -> role for parent lookups
    const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]))

    // Combine data
    const rolesWithDetails: RoleWithDetails[] = roles.map((role) => ({
      ...role,
      accountable_to_role: role.accountable_to_role_id
        ? roleMap.get(role.accountable_to_role_id) || null
        : null,
      employee_count: countMap.get(role.id) || 0,
    }))

    return { data: rolesWithDetails, error: null }
  } catch (error) {
    console.error('Error in getRoles:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get a single role by ID with members
 */
export async function getRoleById(
  roleId: string
): Promise<{
  data: RoleWithMembers | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Get the role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError || !role) {
      console.error('Error fetching role:', roleError)
      return { data: null, error: 'Role not found' }
    }

    // Get parent role if exists
    let parentRole: Role | null = null
    if (role.accountable_to_role_id) {
      const { data: parent } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role.accountable_to_role_id)
        .single()
      parentRole = parent
    }

    // Get members with profiles
    const { data: members, error: membersError } = await supabase
      .from('employee_roles')
      .select(
        `
        *,
        profile:profiles(*)
      `
      )
      .eq('role_id', roleId)

    if (membersError) {
      console.error('Error fetching role members:', membersError)
      return { data: null, error: 'Failed to fetch role members' }
    }

    const roleWithMembers: RoleWithMembers = {
      ...role,
      accountable_to_role: parentRole,
      members: members || [],
    }

    return { data: roleWithMembers, error: null }
  } catch (error) {
    console.error('Error in getRoleById:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new role (admin only)
 */
export async function createRole(
  name: string,
  description: string | null,
  accountableToRoleId: string | null
): Promise<{
  data: Role | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: null, error: 'Insufficient permissions' }
    }

    // Validate inputs
    if (!name || name.trim() === '') {
      return { data: null, error: 'Role name is required' }
    }

    // Create the role
    const newRole: TablesInsert<'roles'> = {
      name: name.trim(),
      description: description?.trim() || null,
      accountable_to_role_id: accountableToRoleId,
    }

    const { data: role, error: insertError } = await supabase
      .from('roles')
      .insert(newRole)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating role:', insertError)
      if (insertError.code === '23505') {
        return { data: null, error: 'A role with this name already exists' }
      }
      return { data: null, error: 'Failed to create role' }
    }

    revalidatePath('/roles')
    return { data: role, error: null }
  } catch (error) {
    console.error('Error in createRole:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Update a role (admin only)
 */
export async function updateRole(
  roleId: string,
  name: string,
  description: string | null,
  accountableToRoleId: string | null
): Promise<{
  data: Role | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: null, error: 'Insufficient permissions' }
    }

    // Validate inputs
    if (!name || name.trim() === '') {
      return { data: null, error: 'Role name is required' }
    }

    // Prevent circular references
    if (accountableToRoleId === roleId) {
      return { data: null, error: 'A role cannot be accountable to itself' }
    }

    // Update the role
    const updates: TablesUpdate<'roles'> = {
      name: name.trim(),
      description: description?.trim() || null,
      accountable_to_role_id: accountableToRoleId,
    }

    const { data: role, error: updateError } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating role:', updateError)
      if (updateError.code === '23505') {
        return { data: null, error: 'A role with this name already exists' }
      }
      return { data: null, error: 'Failed to update role' }
    }

    revalidatePath('/roles')
    return { data: role, error: null }
  } catch (error) {
    console.error('Error in updateRole:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a role (admin only)
 */
export async function deleteRole(roleId: string): Promise<{
  data: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: false, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: false, error: 'Insufficient permissions' }
    }

    // Check if any roles are accountable to this role
    const { data: childRoles, error: childError } = await supabase
      .from('roles')
      .select('id')
      .eq('accountable_to_role_id', roleId)

    if (childError) {
      console.error('Error checking child roles:', childError)
      return { data: false, error: 'Failed to check role dependencies' }
    }

    if (childRoles && childRoles.length > 0) {
      return {
        data: false,
        error: 'Cannot delete role with other roles accountable to it',
      }
    }

    // Delete the role (CASCADE will handle employee_roles)
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) {
      console.error('Error deleting role:', deleteError)
      return { data: false, error: 'Failed to delete role' }
    }

    revalidatePath('/roles')
    return { data: true, error: null }
  } catch (error) {
    console.error('Error in deleteRole:', error)
    return { data: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Assign a user to a role (admin only)
 */
export async function assignUserToRole(
  profileId: string,
  roleId: string
): Promise<{
  data: EmployeeRole | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: null, error: 'Insufficient permissions' }
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('employee_roles')
      .select('*')
      .eq('profile_id', profileId)
      .eq('role_id', roleId)
      .maybeSingle()

    if (existing) {
      return { data: null, error: 'User is already assigned to this role' }
    }

    // Create the assignment
    const newAssignment: TablesInsert<'employee_roles'> = {
      profile_id: profileId,
      role_id: roleId,
    }

    const { data: assignment, error: insertError } = await supabase
      .from('employee_roles')
      .insert(newAssignment)
      .select()
      .single()

    if (insertError) {
      console.error('Error assigning user to role:', insertError)
      return { data: null, error: 'Failed to assign user to role' }
    }

    revalidatePath('/roles')
    return { data: assignment, error: null }
  } catch (error) {
    console.error('Error in assignUserToRole:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Remove a user from a role (admin only)
 */
export async function removeUserFromRole(
  profileId: string,
  roleId: string
): Promise<{
  data: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: false, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: false, error: 'Insufficient permissions' }
    }

    // Remove the assignment
    const { error: deleteError } = await supabase
      .from('employee_roles')
      .delete()
      .eq('profile_id', profileId)
      .eq('role_id', roleId)

    if (deleteError) {
      console.error('Error removing user from role:', deleteError)
      return { data: false, error: 'Failed to remove user from role' }
    }

    revalidatePath('/roles')
    return { data: true, error: null }
  } catch (error) {
    console.error('Error in removeUserFromRole:', error)
    return { data: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reorder roles (admin only)
 */
export async function reorderRoles(
  roleOrders: { id: string; display_order: number }[]
): Promise<{
  data: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: false, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)
    if (!isAdmin) {
      return { data: false, error: 'Insufficient permissions' }
    }

    // Update display_order for all roles
    const updates = roleOrders.map(({ id, display_order }) =>
      supabase.from('roles').update({ display_order }).eq('id', id)
    )

    // Execute all updates in parallel
    const results = await Promise.all(updates)

    // Check if any updates failed
    const failedUpdate = results.find((result) => result.error)
    if (failedUpdate?.error) {
      console.error('Error reordering roles:', failedUpdate.error)
      return { data: false, error: 'Failed to reorder roles' }
    }

    revalidatePath('/roles')
    return { data: true, error: null }
  } catch (error) {
    console.error('Error in reorderRoles:', error)
    return { data: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get all active profiles for assignment
 */
export async function getActiveProfiles(): Promise<{
  data: Profile[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { data: null, error: 'Failed to fetch profiles' }
    }

    return { data: profiles || [], error: null }
  } catch (error) {
    console.error('Error in getActiveProfiles:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}
