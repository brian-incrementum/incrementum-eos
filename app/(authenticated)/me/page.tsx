import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import SignOutButton from './sign-out-button'

export default async function ProfilePage() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Try to fetch employee data by matching email
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('company_email', user.email)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Sign Out */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <SignOutButton />
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-8">
            <div className="flex items-center gap-6 mb-6">
              {profile?.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || 'No name'}
                </h2>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  User ID: {user.id}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Account Status</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile?.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created At</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Information Card */}
        {employee ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Employee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Manager</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.manager || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Employment Status</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Company Email</p>
                  <p className="mt-1 text-sm text-gray-900">{employee.company_email || 'N/A'}</p>
                </div>
                {employee.slack_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Slack ID</p>
                    <p className="mt-1 text-sm text-gray-900">{employee.slack_id}</p>
                  </div>
                )}
                {employee.click_up_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">ClickUp ID</p>
                    <p className="mt-1 text-sm text-gray-900">{employee.click_up_id}</p>
                  </div>
                )}
                {employee.photo && typeof employee.photo === 'object' && 'url' in employee.photo && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 mb-2">Employee Photo</p>
                    <Image
                      src={employee.photo.url as string}
                      alt={employee.full_name || 'Employee photo'}
                      width={200}
                      height={200}
                      className="rounded-lg"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Last Synced</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {employee.synced_at ? new Date(employee.synced_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Employee Information Not Found
            </h3>
            <p className="text-yellow-700">
              Your email ({user.email}) is not linked to an employee record in the system.
              Please contact your administrator.
            </p>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-6">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
