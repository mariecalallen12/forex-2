/**
 * Firestore Collections and Schemas
 * 
 * Defines database structure and helper functions for Firestore operations.
 * Replaces in-memory storage with persistent database.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { firestore } from '../firebase';
import {
  Timestamp,
  FieldValue,
  DocumentReference,
  CollectionReference,
} from 'firebase-admin/firestore';

/**
 * Collection names
 */
export const Collections = {
  USERS: 'users',
  TRADES: 'trades',
  ORDERS: 'orders',
  TRANSACTIONS: 'transactions',
  KYC_PROFILES: 'kyc_profiles',
  AML_RECORDS: 'aml_records',
  COMPLIANCE_LOGS: 'compliance_logs',
  AUDIT_LOGS: 'audit_logs',
  SANCTIONS_SCREENINGS: 'sanctions_screenings',
  TRANSACTION_MONITORING: 'transaction_monitoring',
  COMPLIANCE_REPORTS: 'compliance_reports',
  TRADING_CONFIGS: 'trading_configs',
  SYSTEM_CONFIG: 'system_config',
  NOTIFICATIONS: 'notifications',
  PRICE_HISTORY: 'price_history',
} as const;

/**
 * User document structure
 */
export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'superadmin';
  isActive: boolean;
  isVerified: boolean;
  kycStatus: 'pending' | 'in_review' | 'verified' | 'rejected';
  balance: number;
  balanceUSD: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Trade document structure
 */
export interface TradeDocument {
  id: string;
  userId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  status: 'open' | 'closed';
  openedAt: Timestamp;
  closedAt?: Timestamp;
  closeReason?: string;
  adminModified?: boolean;
  adminModifiedAt?: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * KYC Profile document structure
 */
export interface KYCProfileDocument {
  id: string;
  userId: string;
  status: 'pending' | 'in_review' | 'verified' | 'rejected';
  verificationLevel: 'basic' | 'intermediate' | 'advanced';
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    phone?: string;
  };
  addressInfo: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  identityDocuments: Array<{
    type: 'passport' | 'id_card' | 'drivers_license';
    number: string;
    issuingCountry: string;
    expiryDate: string;
    documentUrl?: string;
    verified: boolean;
  }>;
  verificationHistory: Array<{
    action: string;
    performedBy: string;
    reason?: string;
    timestamp: Timestamp;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  verifiedAt?: Timestamp;
  reviewedBy?: string;
}

/**
 * AML Record document structure
 */
export interface AMLRecordDocument {
  id: string;
  userId: string;
  screeningType: 'customer' | 'transaction' | 'periodic';
  status: 'clear' | 'flagged' | 'under_review' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high';
  findings: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    source: string;
  }>;
  screenedAt: Timestamp;
  screenedBy: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit Log document structure
 */
export interface AuditLogDocument {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Database helper functions
 */
export class DatabaseService {
  /**
   * Create a document with auto-generated ID
   */
  static async createDocument<T extends Record<string, any>>(
    collection: string,
    data: Omit<T, 'id'>
  ): Promise<{ id: string; data: T }> {
    const docRef = firestore.collection(collection).doc();
    const docData = {
      ...data,
      id: docRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    } as T;

    await docRef.set(docData);
    
    return { id: docRef.id, data: docData };
  }

  /**
   * Update a document
   */
  static async updateDocument(
    collection: string,
    docId: string,
    updates: Record<string, any>
  ): Promise<void> {
    await firestore.collection(collection).doc(docId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get a document by ID
   */
  static async getDocument<T>(
    collection: string,
    docId: string
  ): Promise<T | null> {
    const doc = await firestore.collection(collection).doc(docId).get();
    return doc.exists ? (doc.data() as T) : null;
  }

  /**
   * Delete a document
   */
  static async deleteDocument(collection: string, docId: string): Promise<void> {
    await firestore.collection(collection).doc(docId).delete();
  }

  /**
   * Query documents with filters
   */
  static async queryDocuments<T>(
    collection: string,
    filters: Array<{ field: string; operator: any; value: any }>,
    options?: {
      orderBy?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    let query: any = firestore.collection(collection);

    // Apply filters
    filters.forEach(({ field, operator, value }) => {
      query = query.where(field, operator, value);
    });

    // Apply ordering
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction);
    }

    // Apply pagination
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => doc.data() as T);
  }

  /**
   * Count documents with filters
   */
  static async countDocuments(
    collection: string,
    filters: Array<{ field: string; operator: any; value: any }> = []
  ): Promise<number> {
    let query: any = firestore.collection(collection);

    filters.forEach(({ field, operator, value }) => {
      query = query.where(field, operator, value);
    });

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Batch write operations
   */
  static async batchWrite(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      collection: string;
      docId?: string;
      data?: Record<string, any>;
    }>
  ): Promise<void> {
    const batch = firestore.batch();

    operations.forEach(({ type, collection, docId, data }) => {
      if (type === 'create') {
        const docRef = docId
          ? firestore.collection(collection).doc(docId)
          : firestore.collection(collection).doc();
        batch.set(docRef, {
          ...data,
          id: docRef.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === 'update' && docId) {
        const docRef = firestore.collection(collection).doc(docId);
        batch.update(docRef, {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === 'delete' && docId) {
        const docRef = firestore.collection(collection).doc(docId);
        batch.delete(docRef);
      }
    });

    await batch.commit();
  }

  /**
   * Transaction operations
   */
  static async runTransaction<T>(
    callback: (transaction: FirebaseFirestore.Transaction) => Promise<T>
  ): Promise<T> {
    return firestore.runTransaction(callback);
  }
}

/**
 * Create indexes for optimal query performance
 * Run this during deployment
 */
export async function createIndexes(): Promise<void> {
  console.log('📊 Creating Firestore indexes...');
  
  // Note: Firestore indexes should be created through Firebase Console
  // or firebase.indexes.json file for composite indexes
  
  // Single-field indexes are created automatically
  // Composite indexes examples (add to firebase.indexes.json):
  
  const indexDefinitions = {
    trades: [
      { fields: ['userId', 'status', 'openedAt'] },
      { fields: ['symbol', 'status', 'openedAt'] },
      { fields: ['status', 'openedAt'] },
    ],
    kyc_profiles: [
      { fields: ['userId', 'status', 'updatedAt'] },
      { fields: ['status', 'createdAt'] },
    ],
    aml_records: [
      { fields: ['userId', 'status', 'screenedAt'] },
      { fields: ['status', 'riskLevel', 'screenedAt'] },
    ],
    audit_logs: [
      { fields: ['userId', 'action', 'timestamp'] },
      { fields: ['resource', 'timestamp'] },
    ],
  };

  console.log('ℹ️  Index definitions:', JSON.stringify(indexDefinitions, null, 2));
  console.log('ℹ️  Create these indexes in Firebase Console or firebase.indexes.json');
}

export default DatabaseService;
