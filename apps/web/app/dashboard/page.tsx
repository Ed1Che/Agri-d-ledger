import { getCurrentUser, getUserRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const role = await getUserRole()

  if (!user) {
    redirect('/auth/login')
  }

  // Route to appropriate dashboard based on user role
  switch (role) {
    case 'farmer':
      redirect('/dashboard/farmer')
    case 'buyer':
      redirect('/dashboard/buyer')
    case 'admin':
    case 'system_admin':
      redirect('/dashboard/admin')
    default:
      redirect('/dashboard/farmer')
  }
}
