// Project settings form. Server component; submits to a server action.
// Secret fields are never prefilled. A blank secret keeps the stored value.
import Link from 'next/link';
import { listClients } from '../lib/store';
import type { Project } from '../lib/types';

function healthText(project: Partial<Project>): string {
  return (project?.health_endpoints || []).map((e) => `${e.name} | ${e.url} | ${e.expectStatus || 200}`).join('\n');
}

interface ProjectFormProps {
  project?: Project | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ProjectForm({ project, action, submitLabel = 'Save project' }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const d: Partial<Project> = project || {};
  const db = d.database || ({} as Partial<Project['database']>);
  const backup = d.backup || ({} as Partial<Project['backup']>);
  const git = d.git || ({} as Partial<Project['git']>);

  return (
    <form action={action} className="form">
      <section className="form-section">
        <div className="form-section-head">
          <h2>General</h2>
          <span className="muted small">What this project is called and who it is for.</span>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Project name *</span>
            <input type="text" name="name" required defaultValue={d.name || ''} placeholder="CodeDharma Web" />
          </label>
          <label className="field">
            <span className="field-label">Slug</span>
            <input type="text" name="slug" defaultValue={d.slug || ''} placeholder="generated from name" className="mono" />
            <span className="hint">Used in URLs. Lowercase letters, numbers and dashes.</span>
          </label>
          <label className="field">
            <span className="field-label">Client</span>
            <select name="client_id" defaultValue={d.clientId || ''}>
              <option value="">No client</option>
              {listClients().map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
            <span className="hint"><Link href="/clients/new">+ New client</Link></span>
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select name="status" defaultValue={d.status || 'active'}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <h2>URLs and health</h2>
          <span className="muted small">Helm checks the health endpoints every minute. The frontend and backend URLs are saved for reference only.</span>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Frontend URL</span>
            <input type="url" name="fe_url" defaultValue={d.fe_url || ''} placeholder="https://www.example.com" className="mono" />
            <span className="hint">Stored only, not checked</span>
          </label>
          <label className="field">
            <span className="field-label">Backend URL</span>
            <input type="url" name="be_url" defaultValue={d.be_url || ''} placeholder="https://api.example.com" className="mono" />
            <span className="hint">Stored only, not checked</span>
          </label>
          <label className="field field-wide">
            <span className="field-label">Health endpoints (checked)</span>
            <textarea name="health" defaultValue={healthText(d)} placeholder={'Backend | https://api.example.com/health | 200'} className="mono" />
            <span className="hint">
              One per line: name | url | expected status (default 200). A backend is &ldquo;up&rdquo; when its health endpoint returns the expected status.
            </span>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <h2>Server and PM2</h2>
          <span className="muted small">Used by the collector and the deploy checks.</span>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Server host</span>
            <input type="text" name="server_host" defaultValue={d.server_host || ''} placeholder="vps-1.example.com" className="mono" />
          </label>
          <label className="field">
            <span className="field-label">PM2 process names</span>
            <input type="text" name="pm2" defaultValue={(d.pm2_process_names || []).join(', ')} placeholder="fifthcusp-api, fifthcusp-web" className="mono" />
            <span className="hint">Comma-separated</span>
          </label>
          <label className="field field-wide">
            <span className="field-label">Log file paths</span>
            <input type="text" name="logs" defaultValue={(d.log_paths || []).join(', ')} placeholder="/var/www/app/logs/error.log" className="mono" />
            <span className="hint">Comma-separated. The collector scans these for errors.</span>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <h2>Git</h2>
          <span className="muted small">Repository this project deploys from.</span>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Repository URL</span>
            <input type="text" name="git_repo" defaultValue={git.repo || ''} placeholder="git@github.com:you/app.git" className="mono" />
          </label>
          <label className="field">
            <span className="field-label">Branch</span>
            <input type="text" name="git_branch" defaultValue={git.branch || 'main'} className="mono" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <h2>Database</h2>
          <span className="muted small">Credentials are encrypted at rest. Use a read-only user for monitoring.</span>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Type</span>
            <select name="db_type" defaultValue={db.type || 'mongodb'}>
              <option value="mongodb">MongoDB</option>
              <option value="postgres">Postgres</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">User</span>
            <input type="text" name="db_user" defaultValue={db.user || ''} placeholder="ops_readonly" className="mono" />
          </label>
          <label className="field field-wide">
            <span className="field-label">Connection string</span>
            <input type="password" name="db_url" autoComplete="off" placeholder={db.url_enc ? 'Saved. Leave blank to keep.' : 'mongodb+srv://…'} className="mono" />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input type="password" name="db_password" autoComplete="new-password" placeholder={db.password_enc ? 'Saved. Leave blank to keep.' : ''} />
          </label>
          <label className="field">
            <span className="field-label">Collections or tables</span>
            <input type="text" name="collections" defaultValue={(db.collections || []).join(', ')} placeholder="contacts, bookings" className="mono" />
            <span className="hint">Comma-separated</span>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <h2>Backups</h2>
          <span className="muted small">Dump, zip and upload to Google Drive on this schedule.</span>
        </div>
        <div className="form-grid">
          <label className="check-field field-wide">
            <input type="checkbox" name="backup_enabled" defaultChecked={backup.enabled ?? false} />
            Backups enabled
          </label>
          <label className="field">
            <span className="field-label">Schedule (cron)</span>
            <input type="text" name="backup_cron" defaultValue={backup.cron || '0 2 * * *'} className="mono" />
          </label>
          <label className="field">
            <span className="field-label">Keep latest backups</span>
            <input type="number" min="1" name="backup_retention" defaultValue={backup.retentionDays || 30} />
            <span className="hint">One backup per run. With a daily schedule, this is the number of days kept.</span>
          </label>
          <label className="field field-wide">
            <span className="field-label">Google Drive folder</span>
            <input type="text" name="backup_drive_folder" defaultValue={backup.driveFolder || ''} placeholder="Backups/codedharma-web" className="mono" />
          </label>
        </div>
      </section>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {isEdit ? <span className="muted small grow">Last saved {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '—'}</span> : null}
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
