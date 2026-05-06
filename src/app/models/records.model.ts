export interface BankAccount {
  id: number;
  label: string;
  bankName: string;
  iban: string;
  isDefault: boolean;
}

export interface Friend {
  id: number;
  name: string;
  phone: string;
  banks: BankAccount[];
}

export interface WpRecord {
  id: number;
  friendId: number;
  amount: number;
  type: 'sent' | 'received';
  transactionId: string;
  status: 'pending' | 'cleared' | 'partially_cleared';
  datetime: string;
  sentFrom: string;
  notes: string;
  receiptUrl: string;
  linkedTo: number | null;
  clearedTotal: number;
}

export interface RecordFilters {
  friendId?: number;
  status?: string;
  type?: string;
}

export interface WpCredentials {
  username: string;
  appPassword: string;
}

export interface FriendBalance {
  friend: Friend;
  totalSentPending: number;
  totalReceivedPending: number;
  net: number; // positive = friend owes me, negative = I owe friend
}
