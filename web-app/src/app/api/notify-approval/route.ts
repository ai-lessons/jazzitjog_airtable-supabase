import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_EMAIL = 'a.altalt.t@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { totalApproved, brandCounts, totalInShoeResults } = body;

    // Format brand counts
    const brandList = Object.entries(brandCounts as Record<string, number>)
      .map(([brand, count]) => `  - ${brand}: ${count}`)
      .join('\n');

    const emailBody = `
Approval Notification
=====================

Date: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}

Items Approved: ${totalApproved}

Brand Breakdown:
${brandList}

Total in shoe_results: ${totalInShoeResults}

---
Sneaker Pipeline System
`.trim();

    // Use Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Sneaker Pipeline <noreply@yourdomain.com>',
          to: [ADMIN_EMAIL],
          subject: `Staging Approval: ${totalApproved} items added to shoe_results`,
          text: emailBody,
        }),
      });

      if (!resendRes.ok) {
        const error = await resendRes.json();
        console.error('Resend API error:', error);
        throw new Error('Failed to send email via Resend');
      }

      return NextResponse.json({ success: true, provider: 'resend' });
    }

    // Fallback: Log to console (for development)
    console.log('📧 Email Notification (not sent, no RESEND_API_KEY):');
    console.log(emailBody);

    return NextResponse.json({ success: true, provider: 'console' });
  } catch (error) {
    console.error('Email notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// API for notifying about new staging items
export async function GET() {
  try {
    const emailBody = `
New Items in Staging
====================

Date: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}

New shoe data has been added to the staging table and is ready for review.

Please log in to review and approve the items:
${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/staging

---
Sneaker Pipeline System
`.trim();

    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Sneaker Pipeline <noreply@yourdomain.com>',
          to: [ADMIN_EMAIL],
          subject: 'New items in staging - Review Required',
          text: emailBody,
        }),
      });

      if (!resendRes.ok) {
        throw new Error('Failed to send email');
      }

      return NextResponse.json({ success: true });
    }

    console.log('📧 New staging items notification:');
    console.log(emailBody);

    return NextResponse.json({ success: true, provider: 'console' });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
