import { Component, NgZone, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { RecordsService } from '../services/records.service';
import { Friend, BankAccount, WpRecord, FriendBalance } from '../models/records.model';

type View = 'friends' | 'friend-detail' | 'record-form';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {
  view: View = 'friends';

  // Friends list
  friends: Friend[] = [];
  balances: FriendBalance[] = [];
  friendsLoading = false;
  friendsError = '';

  // Selected friend for detail view
  selectedFriend: Friend | null = null;
  friendRecords: WpRecord[] = [];
  recordsLoading = false;

  // Record form
  editingRecord: WpRecord | null = null;
  recordForm: Partial<WpRecord> = {};
  formSaving = false;

  // Filters for friend-detail view
  filterStatus = '';
  filterType = '';

  constructor(
    public recordsSvc: RecordsService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private zone: NgZone,
  ) {}

  async ngOnInit() {
    await this.recordsSvc.init();
    if (this.recordsSvc.hasCredentials()) {
      await this.loadFriends();
    }
  }

  // ── Credentials ────────────────────────────────────────────────────────────

  get hasCredentials() {
    return this.recordsSvc.hasCredentials();
  }

  async openCredentialsDialog() {
    const alert = await this.alertCtrl.create({
      header: 'WP Credentials',
      message: 'Enter your WordPress username and Application Password (WP Admin → Users → Application Passwords).',
      inputs: [
        { name: 'username', type: 'text', placeholder: 'WP Username', value: this.recordsSvc.getUsername() },
        { name: 'appPassword', type: 'text', placeholder: 'Application Password', value: this.recordsSvc.getStoredPassword() },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const u = (data.username ?? '').trim();
            const p = (data.appPassword ?? '').trim();
            if (!u || !p) { this.toast('Username and password are required.', 'warning'); return false; }
            this.zone.run(async () => {
              await this.recordsSvc.setCredentials(u, p);
              await this.loadFriends();
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async clearCredentials() {
    const alert = await this.alertCtrl.create({
      header: 'Clear Credentials',
      message: 'Remove saved WP credentials from this device?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear', role: 'destructive',
          handler: () => {
            this.zone.run(async () => {
              await this.recordsSvc.clearCredentials();
              this.friends = [];
              this.balances = [];
              this.view = 'friends';
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Friends list ───────────────────────────────────────────────────────────

  async loadFriends() {
    this.friendsLoading = true;
    this.friendsError = '';
    try {
      this.friends = await this.recordsSvc.getFriends();
      await this.computeBalances();
    } catch (e: any) {
      this.friendsError = e?.error?.message ?? e?.message ?? 'Failed to load friends.';
    } finally {
      this.friendsLoading = false;
    }
  }

  private async computeBalances() {
    // Fetch all pending/partially_cleared records to compute per-friend balances
    const allRecords = await this.recordsSvc.getRecords().catch(() => [] as WpRecord[]);
    this.balances = this.friends.map(friend => {
      const recs = allRecords.filter(r =>
        r.friendId === friend.id && (r.status === 'pending' || r.status === 'partially_cleared')
      );
      const totalSentPending = recs.filter(r => r.type === 'sent').reduce((s, r) => s + r.amount, 0);
      const totalReceivedPending = recs.filter(r => r.type === 'received').reduce((s, r) => s + r.amount, 0);
      return { friend, totalSentPending, totalReceivedPending, net: totalSentPending - totalReceivedPending };
    });
  }

  getBalance(friendId: number): FriendBalance | undefined {
    return this.balances.find(b => b.friend.id === friendId);
  }

  // ── Add / Edit friend ──────────────────────────────────────────────────────

  async openFriendForm(friend?: Friend) {
    const alert = await this.alertCtrl.create({
      header: friend ? 'Edit Friend' : 'Add Friend',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Full Name', value: friend?.name ?? '' },
        { name: 'phone', type: 'tel', placeholder: 'Phone (optional)', value: friend?.phone ?? '' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: friend ? 'Update' : 'Add',
          handler: (data) => {
            const name = (data.name ?? '').trim();
            if (!name) { this.toast('Name is required.', 'warning'); return false; }
            this.zone.run(async () => {
              const loading = await this.showLoading(friend ? 'Updating…' : 'Adding…');
              try {
                if (friend) {
                  const updated = await this.recordsSvc.updateFriend(friend.id, name, data.phone ?? '');
                  const idx = this.friends.findIndex(f => f.id === friend.id);
                  if (idx >= 0) this.friends[idx] = { ...this.friends[idx], ...updated };
                  if (this.selectedFriend?.id === friend.id) this.selectedFriend = { ...this.selectedFriend, ...updated };
                } else {
                  const created = await this.recordsSvc.createFriend(name, data.phone ?? '');
                  this.friends.push(created);
                  this.balances.push({ friend: created, totalSentPending: 0, totalReceivedPending: 0, net: 0 });
                }
                this.toast(friend ? 'Friend updated.' : 'Friend added.', 'success');
              } catch (e: any) {
                this.toast(e?.error?.message ?? 'Failed to save friend.', 'danger');
              } finally {
                loading.dismiss();
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDeleteFriend(friend: Friend) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Friend',
      message: `Delete "${friend.name}" and all their bank accounts and records? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.zone.run(async () => {
              const loading = await this.showLoading('Deleting…');
              try {
                await this.recordsSvc.deleteFriend(friend.id);
                this.friends = this.friends.filter(f => f.id !== friend.id);
                this.balances = this.balances.filter(b => b.friend.id !== friend.id);
                if (this.selectedFriend?.id === friend.id) {
                  this.selectedFriend = null;
                  this.view = 'friends';
                }
                this.toast('Friend deleted.', 'success');
              } catch (e: any) {
                this.toast(e?.error?.message ?? 'Failed to delete friend.', 'danger');
              } finally {
                loading.dismiss();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Friend detail ──────────────────────────────────────────────────────────

  async openFriendDetail(friend: Friend) {
    this.selectedFriend = friend;
    this.filterStatus = '';
    this.filterType = '';
    this.view = 'friend-detail';
    await this.loadFriendRecords();
  }

  async loadFriendRecords() {
    if (!this.selectedFriend) return;
    this.recordsLoading = true;
    try {
      this.friendRecords = await this.recordsSvc.getRecords({
        friendId: this.selectedFriend.id,
        status: this.filterStatus || undefined,
        type: this.filterType || undefined,
      });
    } catch (e: any) {
      this.toast(e?.error?.message ?? 'Failed to load records.', 'danger');
    } finally {
      this.recordsLoading = false;
    }
  }

  get filteredRecords(): WpRecord[] {
    return this.friendRecords;
  }

  // ── Bank accounts ──────────────────────────────────────────────────────────

  async openAddBankDialog() {
    if (!this.selectedFriend) return;
    const alert = await this.alertCtrl.create({
      header: 'Add Bank Account',
      inputs: [
        { name: 'label',    type: 'text', placeholder: 'Label (e.g. Personal)' },
        { name: 'bankName', type: 'text', placeholder: 'Bank Name' },
        { name: 'iban',     type: 'text', placeholder: 'IBAN / Account Number' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            const label = (data.label ?? '').trim();
            const bankName = (data.bankName ?? '').trim();
            const iban = (data.iban ?? '').trim();
            if (!label || !bankName) { this.toast('Label and bank name are required.', 'warning'); return false; }
            this.zone.run(async () => {
              const loading = await this.showLoading('Adding bank…');
              try {
                const bank = await this.recordsSvc.addBank(this.selectedFriend!.id, label, bankName, iban, false);
                const updatedBanks = [...(this.selectedFriend!.banks ?? []), bank];
                this.selectedFriend = { ...this.selectedFriend!, banks: updatedBanks };
                const idx = this.friends.findIndex(f => f.id === this.selectedFriend!.id);
                if (idx >= 0) this.friends[idx] = { ...this.friends[idx], banks: updatedBanks };
                await this.recordsSvc.syncFriendToFirestore(this.selectedFriend!);
                this.toast('Bank account added.', 'success');
              } catch (e: any) {
                this.toast(e?.error?.message ?? 'Failed to add bank.', 'danger');
              } finally {
                loading.dismiss();
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async setDefaultBank(bank: BankAccount) {
    if (!this.selectedFriend) return;
    const loading = await this.showLoading('Setting default…');
    try {
      await this.recordsSvc.setDefaultBank(bank.id);
      const banks = (this.selectedFriend.banks ?? []).map(b => ({ ...b, isDefault: b.id === bank.id }));
      this.selectedFriend = { ...this.selectedFriend, banks };
      const idx = this.friends.findIndex(f => f.id === this.selectedFriend!.id);
      if (idx >= 0) this.friends[idx].banks = banks;
      await this.recordsSvc.syncFriendToFirestore(this.selectedFriend);
      this.toast('Default bank updated.', 'success');
    } catch (e: any) {
      this.toast(e?.error?.message ?? 'Failed to update default bank.', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async confirmDeleteBank(bank: BankAccount) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Bank Account',
      message: `Delete "${bank.label} – ${bank.bankName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.zone.run(async () => {
              const loading = await this.showLoading('Deleting…');
              try {
                await this.recordsSvc.deleteBank(bank.id);
                if (this.selectedFriend) {
                  const banks = this.selectedFriend.banks.filter(b => b.id !== bank.id);
                  this.selectedFriend = { ...this.selectedFriend, banks };
                  const idx = this.friends.findIndex(f => f.id === this.selectedFriend!.id);
                  if (idx >= 0) this.friends[idx].banks = banks;
                  await this.recordsSvc.syncFriendToFirestore(this.selectedFriend);
                }
                this.toast('Bank account deleted.', 'success');
              } catch (e: any) {
                this.toast(e?.error?.message ?? 'Failed to delete bank.', 'danger');
              } finally {
                loading.dismiss();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Record form ────────────────────────────────────────────────────────────

  openNewRecordForm() {
    this.editingRecord = null;
    this.recordForm = {
      friendId: this.selectedFriend?.id,
      type: 'sent',
      status: 'pending',
      amount: undefined,
      transactionId: '',
      datetime: new Date().toISOString().slice(0, 16),
      sentFrom: '',
      notes: '',
    };
    this.view = 'record-form';
  }

  openEditRecordForm(record: WpRecord) {
    this.editingRecord = record;
    this.recordForm = {
      friendId: record.friendId,
      type: record.type,
      status: record.status,
      amount: record.amount,
      transactionId: record.transactionId,
      datetime: record.datetime ? record.datetime.slice(0, 16) : '',
      sentFrom: record.sentFrom,
      notes: record.notes,
    };
    this.view = 'record-form';
  }

  cancelRecordForm() {
    this.view = this.selectedFriend ? 'friend-detail' : 'friends';
  }

  async saveRecord() {
    if (!this.recordForm.friendId || !this.recordForm.amount || !this.recordForm.type || !this.recordForm.status) {
      this.toast('Friend, amount, type, and status are required.', 'warning');
      return;
    }
    this.formSaving = true;
    const loading = await this.showLoading(this.editingRecord ? 'Updating record…' : 'Saving record…');
    try {
      const payload: Partial<WpRecord> = { ...this.recordForm };
      if (this.editingRecord) {
        const updated = await this.recordsSvc.updateRecord(this.editingRecord.id, payload);
        const idx = this.friendRecords.findIndex(r => r.id === this.editingRecord!.id);
        if (idx >= 0) this.friendRecords[idx] = updated;
      } else {
        const created = await this.recordsSvc.createRecord(payload);
        this.friendRecords.unshift(created);
      }
      await this.computeBalances();
      this.toast(this.editingRecord ? 'Record updated.' : 'Record saved.', 'success');
      this.view = 'friend-detail';
    } catch (e: any) {
      this.toast(e?.error?.message ?? 'Failed to save record.', 'danger');
    } finally {
      this.formSaving = false;
      loading.dismiss();
    }
  }

  async confirmDeleteRecord(record: WpRecord) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Record',
      message: `Delete this ${record.type} record of PKR ${record.amount}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.zone.run(async () => {
              const loading = await this.showLoading('Deleting…');
              try {
                await this.recordsSvc.deleteRecord(record.id);
                this.friendRecords = this.friendRecords.filter(r => r.id !== record.id);
                await this.computeBalances();
                this.toast('Record deleted.', 'success');
              } catch (e: any) {
                this.toast(e?.error?.message ?? 'Failed to delete record.', 'danger');
              } finally {
                loading.dismiss();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack() {
    if (this.view === 'record-form') {
      this.view = this.selectedFriend ? 'friend-detail' : 'friends';
    } else {
      this.selectedFriend = null;
      this.friendRecords = [];
      this.view = 'friends';
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getStatusColor(status: string): string {
    return status === 'cleared' ? 'success' : status === 'partially_cleared' ? 'warning' : 'danger';
  }

  getStatusLabel(status: string): string {
    return status === 'partially_cleared' ? 'Partial' : status === 'cleared' ? 'Cleared' : 'Pending';
  }

  getTypeColor(type: string): string {
    return type === 'sent' ? 'primary' : 'tertiary';
  }

  getTypeLabel(type: string): string {
    return type === 'sent' ? 'Sent' : 'Received';
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  private async showLoading(message: string) {
    const loading = await this.loadingCtrl.create({ message, duration: 15000 });
    await loading.present();
    return loading;
  }

  private async toast(message: string, color: string = 'dark') {
    const t = await this.toastCtrl.create({ message, color, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
