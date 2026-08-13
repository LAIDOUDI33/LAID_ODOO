// ============================================================
// HASSIBA Suite ERP - Root Page
// Redirects to main dashboard
// ============================================================

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/sales')
}
