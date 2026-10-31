import { notFound } from 'next/navigation'

/**
 * The public referrals page no longer exists. The creator program is private
 * and reached only through a secret token link, so this route is treated as a
 * plain 404 for everyone (identical to any other unknown path).
 */
export default function ReferralsPage() {
  notFound()
}
