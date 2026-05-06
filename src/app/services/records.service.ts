import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom } from 'rxjs';
import {
  Firestore,
  collection, doc, setDoc, deleteDoc, writeBatch, getDocs
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../environments/environment';
import {
  Friend, BankAccount, WpRecord,
  RecordFilters, WpCredentials
} from '../models/records.model';

const CRED_KEY = 'maf_wp_creds';

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly base = `${environment.wpApiUrl}/wp-json/maf/v1`;
  private creds: WpCredentials | null = null;
  private storageReady = false;

  constructor(
    private http: HttpClient,
    private storage: Storage,
    private firestore: Firestore,
    private auth: Auth,
  ) {}

  async init(): Promise<void> {
    if (this.storageReady) return;
    await this.storage.create();
    this.storageReady = true;
    this.creds = await this.storage.get(CRED_KEY);
  }

  async setCredentials(username: string, appPassword: string): Promise<void> {
    await this.init();
    this.creds = { username, appPassword };
    await this.storage.set(CRED_KEY, this.creds);
  }

  async clearCredentials(): Promise<void> {
    await this.init();
    this.creds = null;
    await this.storage.remove(CRED_KEY);
  }

  hasCredentials(): boolean {
    return !!this.creds;
  }

  getUsername(): string {
    return this.creds?.username ?? '';
  }

  getStoredPassword(): string {
    return this.creds?.appPassword ?? '';
  }

  private get uid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated.');
    return uid;
  }

  private friendsCol() {
    return collection(this.firestore, `wp_data/${this.uid}/friends`);
  }

  private recordsCol() {
    return collection(this.firestore, `wp_data/${this.uid}/records`);
  }

  private authHeaders(): HttpHeaders {
    if (!this.creds) throw new Error('WP credentials not configured.');
    const token = btoa(`${this.creds.username}:${this.creds.appPassword}`);
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }

  // ── Friends ────────────────────────────────────────────────────────────────

  async getFriends(): Promise<Friend[]> {
    const friends = await firstValueFrom(
      this.http.get<Friend[]>(`${this.base}/friends`, { headers: this.authHeaders() })
    );
    await this.syncFriendsToFirestore(friends);
    return friends;
  }

  async createFriend(name: string, phone: string): Promise<Friend> {
    const friend = await firstValueFrom(
      this.http.post<Friend>(`${this.base}/friends`, { name, phone }, { headers: this.authHeaders() })
    );
    await setDoc(doc(this.friendsCol(), String(friend.id)), friend);
    return friend;
  }

  async updateFriend(id: number, name: string, phone: string): Promise<Friend> {
    const friend = await firstValueFrom(
      this.http.put<Friend>(`${this.base}/friends/${id}`, { name, phone }, { headers: this.authHeaders() })
    );
    await setDoc(doc(this.friendsCol(), String(friend.id)), friend);
    return friend;
  }

  async deleteFriend(id: number): Promise<unknown> {
    const result = await firstValueFrom(
      this.http.delete(`${this.base}/friends/${id}`, { headers: this.authHeaders() })
    );
    await deleteDoc(doc(this.friendsCol(), String(id)));
    // cascade-delete that friend's records from Firestore
    const snap = await getDocs(this.recordsCol());
    const batch = writeBatch(this.firestore);
    snap.docs
      .filter(d => (d.data() as WpRecord).friendId === id)
      .forEach(d => batch.delete(d.ref));
    await batch.commit();
    return result;
  }

  // ── Banks (bank changes update the parent friend doc) ─────────────────────

  async addBank(friendId: number, label: string, bankName: string, iban: string, isDefault: boolean): Promise<BankAccount> {
    const bank = await firstValueFrom(
      this.http.post<BankAccount>(
        `${this.base}/friends/${friendId}/banks`,
        { label, bankName, iban, isDefault },
        { headers: this.authHeaders() }
      )
    );
    return bank;
  }

  async setDefaultBank(bankId: number): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(`${this.base}/banks/${bankId}/default`, {}, { headers: this.authHeaders() })
    );
  }

  async deleteBank(bankId: number): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/banks/${bankId}`, { headers: this.authHeaders() })
    );
  }

  // Call after any bank mutation to keep Firestore friend doc in sync
  async syncFriendToFirestore(friend: Friend): Promise<void> {
    await setDoc(doc(this.friendsCol(), String(friend.id)), friend);
  }

  // ── Records ────────────────────────────────────────────────────────────────

  async getRecords(filters?: RecordFilters): Promise<WpRecord[]> {
    let params = new HttpParams();
    if (filters?.friendId) params = params.set('friendId', filters.friendId);
    if (filters?.status)   params = params.set('status', filters.status);
    if (filters?.type)     params = params.set('type', filters.type);
    const records = await firstValueFrom(
      this.http.get<WpRecord[]>(`${this.base}/records`, { headers: this.authHeaders(), params })
    );
    // Only sync unfiltered fetches to avoid partial overwrites
    if (!filters?.friendId && !filters?.status && !filters?.type) {
      await this.syncRecordsToFirestore(records);
    } else {
      await this.upsertRecordsToFirestore(records);
    }
    return records;
  }

  async createRecord(data: Partial<WpRecord>): Promise<WpRecord> {
    const record = await firstValueFrom(
      this.http.post<WpRecord>(`${this.base}/records`, this.toPayload(data), { headers: this.authHeaders() })
    );
    await setDoc(doc(this.recordsCol(), String(record.id)), record);
    return record;
  }

  async updateRecord(id: number, data: Partial<WpRecord>): Promise<WpRecord> {
    const record = await firstValueFrom(
      this.http.put<WpRecord>(`${this.base}/records/${id}`, this.toPayload(data), { headers: this.authHeaders() })
    );
    await setDoc(doc(this.recordsCol(), String(record.id)), record);
    return record;
  }

  async deleteRecord(id: number): Promise<unknown> {
    const result = await firstValueFrom(
      this.http.delete(`${this.base}/records/${id}`, { headers: this.authHeaders() })
    );
    await deleteDoc(doc(this.recordsCol(), String(id)));
    return result;
  }

  // ── Firestore sync helpers ─────────────────────────────────────────────────

  private async syncFriendsToFirestore(friends: Friend[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    friends.forEach(f => batch.set(doc(this.friendsCol(), String(f.id)), f));
    await batch.commit();
  }

  private async syncRecordsToFirestore(records: WpRecord[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    records.forEach(r => batch.set(doc(this.recordsCol(), String(r.id)), r));
    await batch.commit();
  }

  private async upsertRecordsToFirestore(records: WpRecord[]): Promise<void> {
    if (records.length === 0) return;
    const batch = writeBatch(this.firestore);
    records.forEach(r => batch.set(doc(this.recordsCol(), String(r.id)), r));
    await batch.commit();
  }

  private toPayload(data: Partial<WpRecord>): Record<string, unknown> {
    return {
      friendId:      data.friendId,
      amount:        data.amount,
      type:          data.type,
      transactionId: data.transactionId ?? '',
      status:        data.status,
      datetime:      data.datetime ?? '',
      sentFrom:      data.sentFrom ?? '',
      notes:         data.notes ?? '',
      linkedTo:      data.linkedTo ?? null,
    };
  }
}
