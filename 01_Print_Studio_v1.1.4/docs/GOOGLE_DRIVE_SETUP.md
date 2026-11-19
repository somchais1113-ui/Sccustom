# SCCUSTOM v1.1 — Google Drive Sync setup

## Prerequisites

- Google Cloud project owned by the organization, with **Google Drive API enabled**.
- OAuth consent screen configured, including test users while in testing status.
- OAuth client of type **Web application** with **Authorized JavaScript origins** matching your exact site origin, for example `https://your-account.github.io` (no trailing repo path). Add `http://localhost:8000` for local testing.
- Grant `https://www.googleapis.com/auth/drive.file` scope when asked. Check the OAuth consent and domain ownership requirements applicable to your organization.

## Configure

1. In Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID → Web application.
2. Add the JavaScript origin for your GitHub Pages domain (origin, NOT project path).
3. Copy the **Client ID** into SCCUSTOM → **งานของฉัน → Google Drive Workspace** and click **บันทึก Client ID**.
4. Click **เชื่อม Google Drive**, approve Google's consent dialog.
5. Click **Save งานปัจจุบันไป Drive**. The first save creates folders and a project file. You can search and reopen the saved project using **ค้นหาไฟล์งานบน Drive**.

## Drive folders created by the application

```text
SCCUSTOM_DATA/
└── 02_CUSTOMER_JOBS/
    └── 2026/
        └── ART-2026-000001/
            ├── project.json                  # current editable job
            └── revisions/
                ├── REV-001/project.json      # first snapshot of revision
                └── REV-002/project.json      # first snapshot of revision
```

- Google Drive File IDs, not just file names, identify documents in the API.
- `project.json` saves the editable state. A revision snapshot is created the first time a revision is saved; it will not overwrite earlier revision folders.
- The app updates `project.json` on every save. It does not silently upload on every keystroke.
- OAuth access tokens are held in memory and not saved in localStorage. Only the public OAuth Client ID is stored locally. Never put Client Secrets or service account keys in a GitHub repo.
- `drive.file` is **per-user** and doesn't inherently grant access to colleagues' files. For team collaboration, introduce a protected backend with identity and permission checks and an organization-owned Shared Drive.
- Admin Product Library image upload is local-only in this version; it is *not* stored in the Drive folders above.

## Troubleshooting

- **origin_mismatch**: check the exact protocol and host in Authorized JavaScript origins. The GitHub repo path is NOT part of the origin.
- **access_blocked / testing**: add the account as an OAuth test user or publish the app according to your organization policy.
- **401 / token expired**: click Connect again.
- **No jobs found**: only files created/opened under this app's OAuth permission are accessible through `drive.file`; confirm the same Google account and OAuth Client ID were used.
- **Permissions/Shared Drive**: this pilot intentionally does not support company-wide centralized roles or Shared Drive configuration.

Google references: https://developers.google.com/workspace/drive/api/guides/create-file and https://developers.google.com/workspace/drive/api/guides/api-specific-auth
