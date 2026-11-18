/**
 * Bonus 3 – SharePoint proof-of-concept.
 * Returns mocked intranet announcements shaped like the Microsoft Graph "listItem" projection
 * we would produce from a SharePoint Online list. See docs/SHAREPOINT.md for the real integration.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  publishedAt: string;
  pinned: boolean;
  source: 'mock' | 'sharepoint';
}

const MOCK: Announcement[] = [
  { id: '1', title: 'Peak-season cut-off times', body: 'International bookings must be confirmed by 14:00 IST to ship same day.', author: 'Operations', publishedAt: '2026-11-10T09:00:00Z', pinned: true, source: 'mock' },
  { id: '2', title: 'New customer onboarding checklist', body: 'The updated KYC checklist is live on the Compliance hub.', author: 'Compliance', publishedAt: '2026-11-04T11:30:00Z', pinned: false, source: 'mock' },
  { id: '3', title: 'Scheduled maintenance – Saturday 22:00 IST', body: 'Tracking portal will be read-only for ~30 minutes.', author: 'IT Helpdesk', publishedAt: '2026-10-28T16:45:00Z', pinned: false, source: 'mock' },
];

export const announcementService = {
  async list(): Promise<Announcement[]> {
    // Swap point: replace with a Microsoft Graph call
    //   GET /sites/{site-id}/lists/{list-id}/items?$expand=fields&$orderby=fields/Modified desc
    // using the app's Entra identity (Sites.Selected). Cache for ~5 min.
    return [...MOCK].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
  },
};
