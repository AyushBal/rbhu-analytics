# Bonus 3 – SharePoint integration

Proof-of-concept endpoint: **`GET /api/announcements`** (requires a bearer token). It returns mocked items shaped like the output of a SharePoint list; see `backend/src/services/announcementService.ts`. The dashboard renders them.

## Making it real (Microsoft Graph)

1. **List**: create a SharePoint Online list "Announcements" (Title, Body, Pinned, PublishedDate) on the intranet site.
2. **App registration** (Entra): grant the API the Graph application permission **`Sites.Selected`**, then grant the app read access to just that one site (`POST /sites/{id}/permissions`, role `read`). This avoids the over-broad `Sites.Read.All`.
3. **Credentials**: managed identity in Azure (no secret). Locally, a client secret or developer sign-in.
4. **Call Graph** from the service (replace the mock):
   ```
   GET https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listId}/items
       ?$expand=fields($select=Title,Body,Pinned,PublishedDate)&$orderby=fields/PublishedDate desc&$top=20
   ```
   Map `fields` → `Announcement` (the interface the frontend already consumes).
5. **Caching**: in-memory/Redis for 5 minutes. Use a Graph change-notification webhook (`/subscriptions` on the list) to invalidate immediately and optionally push a WebSocket event.
6. **Delegated alternative**: if announcements must respect per-user SharePoint permissions, use the On-Behalf-Of flow with the user's Entra token instead of app-only access.
7. **Resilience**: handle 429 with `Retry-After`, and serve the last cached value if Graph is unavailable.

The route and response shape stay the same, so the frontend needs no change.
