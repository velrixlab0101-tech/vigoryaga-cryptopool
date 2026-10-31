import { NextResponse } from 'next/server'
import { CREATOR_NOT_FOUND } from '@/lib/referrals'

/**
 * This endpoint historically exposed public referral codes. The creator
 * program is now private, so no public referral data exists. Every request
 * receives an identical 404 so nothing about the program can be inferred or
 * enumerated.
 */
const headers = { 'Cache-Control': 'no-store' }

export function GET() {
  return NextResponse.json(CREATOR_NOT_FOUND, { status: 404, headers })
}

export function POST() {
  return NextResponse.json(CREATOR_NOT_FOUND, { status: 404, headers })
}
