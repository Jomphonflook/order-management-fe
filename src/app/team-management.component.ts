import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAccount, TeamService } from './team.service';

@Component({
  selector: 'app-team-management',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="team-heading">
      <div>
        <span class="team-eyebrow">ACCOUNT MANAGEMENT</span>
        <h1>Admin accounts<span>.</span></h1>
        <p>Create, update, and deactivate staff accounts.</p>
      </div>
    </section>

    @if (errorMessage()) {
      <div class="team-alert" role="alert">{{ errorMessage() }}</div>
    }
    @if (notice()) {
      <div class="team-notice" role="status">{{ notice() }}</div>
    }

    <form class="team-card team-create-form" #createFormElement="ngForm" (ngSubmit)="createAdmin()">
      <h2>Create Admin account</h2>
      <div class="team-form-grid">
        <label>
          <span>Name</span>
          <input name="newName" [(ngModel)]="newAdmin.name" required maxlength="100" />
        </label>
        <label>
          <span>Email</span>
          <input name="newEmail" [(ngModel)]="newAdmin.email" type="email" required maxlength="254" />
        </label>
        <label>
          <span>Initial password (at least 12 characters)</span>
          <input name="newPassword" [(ngModel)]="newAdmin.password" type="password" required minlength="12" maxlength="72" />
        </label>
      </div>
      <button class="team-primary" type="submit" [disabled]="createFormElement.invalid || saving()">
        {{ saving() ? 'Creating...' : 'Create Admin' }}
      </button>
    </form>

    <section class="team-card">
      <header class="team-list-heading">
        <h2>Admin accounts</h2>
        <button type="button" class="team-secondary" [disabled]="loading()" (click)="loadAdmins()">Refresh</button>
      </header>
      @if (loading()) {
        <p class="team-empty">Loading accounts...</p>
      } @else if (admins().length === 0) {
        <p class="team-empty">No Admin accounts yet.</p>
      } @else {
        <div class="team-table-wrap">
          <table class="team-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Password</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (admin of admins(); track admin.id) {
                <tr>
                  @if (editingId() === admin.id) {
                    <td><input [name]="'editName' + admin.id" [(ngModel)]="editForm.name" required maxlength="100" /></td>
                    <td><input [name]="'editEmail' + admin.id" [(ngModel)]="editForm.email" type="email" required maxlength="254" /></td>
                    <td><input [name]="'editPassword' + admin.id" [(ngModel)]="editForm.password" type="password" placeholder="Leave blank to keep" minlength="12" maxlength="72" /></td>
                    <td>{{ admin.isActive ? 'Active' : 'Inactive' }}</td>
                    <td>{{ admin.createdAt ? (admin.createdAt | date:'mediumDate') : '—' }}</td>
                    <td class="team-actions">
                      <button type="button" class="team-secondary" [disabled]="saving() || (editForm.password.length > 0 && editForm.password.length < 12)" (click)="saveEdit(admin)">Save</button>
                      <button type="button" class="team-secondary" (click)="cancelEdit()">Cancel</button>
                    </td>
                  } @else {
                    <td>{{ admin.name }}</td>
                    <td>{{ admin.email }}</td>
                    <td>—</td>
                    <td><span class="team-status" [class.inactive]="!admin.isActive">{{ admin.isActive ? 'Active' : 'Inactive' }}</span></td>
                    <td>{{ admin.createdAt ? (admin.createdAt | date:'mediumDate') : '—' }}</td>
                    <td class="team-actions">
                      <button type="button" class="team-secondary" (click)="beginEdit(admin)">Edit</button>
                      <button type="button" class="team-secondary" [disabled]="saving()" (click)="toggleActive(admin)">
                        {{ admin.isActive ? 'Deactivate' : 'Activate' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host{display:block;color:#252a31;font-family:'DM Sans','Segoe UI',sans-serif}
      .team-heading{margin-bottom:24px}
      .team-eyebrow{color:#6d7a8b;font-size:12px;font-weight:700;letter-spacing:1.35px}
      .team-heading h1{margin:10px 0 6px;font-family:'Manrope','Segoe UI',sans-serif;font-size:clamp(28px,2.3vw,36px);font-weight:650;letter-spacing:-1.2px}
      .team-heading h1 span{color:#728299}
      .team-heading p{margin:0;color:#7b8797;font-size:13px}
      .team-card{margin-bottom:18px;padding:20px;border:1px solid #e6e9ed;border-radius:8px;background:#fff}
      .team-card h2{margin:0 0 16px;color:#3b444f;font-size:17px}
      .team-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}
      label{display:flex;min-width:0;flex-direction:column;gap:6px;color:#697483;font-size:13px;font-weight:600}
      input{width:100%;min-width:0;height:40px;padding:0 10px;border:1px solid #e1e5ea;border-radius:5px;color:#414a56;background:#fff;font:inherit;font-weight:400}
      button{min-height:36px;padding:0 12px;border:1px solid #dfe4ea;border-radius:6px;color:#405672;background:#fff;font:inherit;font-size:13px;font-weight:650;cursor:pointer}
      button:disabled{opacity:.55;cursor:not-allowed}
      .team-primary{border-color:#405672;color:#fff;background:#405672}
      .team-list-heading{display:flex;align-items:center;justify-content:space-between}
      .team-list-heading h2{margin:0}
      .team-table-wrap{overflow:auto;margin-top:16px}
      .team-table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}
      .team-table th,.team-table td{height:52px;padding:8px 12px;border-bottom:1px solid #eff1f4;font-size:13px}
      .team-table th{color:#8791a0;background:#fafbfc;font-weight:650}
      .team-table td input{min-width:150px}
      .team-actions{display:flex;gap:7px}
      .team-status{color:#4c715c}
      .team-status.inactive{color:#895b57}
      .team-alert,.team-notice{margin:0 0 14px;padding:12px;border:1px solid #eed7d5;border-radius:6px;color:#914e4b;background:#fff9f8;font-size:13px}
      .team-notice{border-color:#d7e5dc;color:#466c56;background:#f7fbf8}
      .team-empty{margin:16px 0 0;color:#7e8997;font-size:13px}
      @media(max-width:850px){.team-form-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:560px){.team-form-grid{grid-template-columns:1fr}.team-card{padding:15px}}
    `,
  ],
})
export class TeamManagementComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  protected readonly admins = signal<AdminAccount[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly editingId = signal('');
  protected readonly newAdmin = { name: '', email: '', password: '' };
  protected readonly editForm = { name: '', email: '', password: '' };

  ngOnInit(): void {
    this.loadAdmins();
  }

  protected loadAdmins(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.teamService.getAdmins().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.loading.set(false);
      },
    });
  }

  protected createAdmin(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set('');
    this.teamService.createAdmin({
      name: this.newAdmin.name.trim(),
      email: this.newAdmin.email.trim(),
      password: this.newAdmin.password,
    }).subscribe({
      next: (admin) => {
        this.admins.update((admins) => [admin, ...admins]);
        this.newAdmin.name = '';
        this.newAdmin.email = '';
        this.newAdmin.password = '';
        this.notice.set('Admin account created.');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  protected beginEdit(admin: AdminAccount): void {
    this.editingId.set(admin.id);
    this.editForm.name = admin.name;
    this.editForm.email = admin.email;
    this.editForm.password = '';
  }

  protected cancelEdit(): void {
    this.editingId.set('');
    this.editForm.password = '';
  }

  protected saveEdit(admin: AdminAccount): void {
    if (this.saving()) return;
    const input: { name: string; email: string; password?: string } = {
      name: this.editForm.name.trim(),
      email: this.editForm.email.trim(),
    };
    if (this.editForm.password) input.password = this.editForm.password;
    this.saving.set(true);
    this.errorMessage.set('');
    this.teamService.updateAdmin(admin.id, input).subscribe({
      next: (updated) => {
        this.admins.update((admins) => admins.map((item) => item.id === updated.id ? updated : item));
        this.cancelEdit();
        this.notice.set('Admin account updated.');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  protected toggleActive(admin: AdminAccount): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set('');
    this.teamService.updateAdmin(admin.id, { isActive: !admin.isActive }).subscribe({
      next: (updated) => {
        this.admins.update((admins) => admins.map((item) => item.id === updated.id ? updated : item));
        this.notice.set(updated.isActive ? 'Admin account activated.' : 'Admin account deactivated.');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    return error.status === 0
      ? 'Could not connect to the server. Please try again.'
      : 'Unable to update Admin accounts.';
  }
}
