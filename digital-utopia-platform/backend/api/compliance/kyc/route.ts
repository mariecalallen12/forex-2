// KYC Verification API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: KYC (Know Your Customer) verification and document management system

import { NextRequest, NextResponse } from 'next/server';
import {
  KYCProfile,
  PersonalInfo,
  AddressInfo,
  IdentityDocument,
  VerificationHistory,
  ComplianceStatusResponse,
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// In-memory storage (in production, use database)
let kycProfiles: KYCProfile[] = [];
let documents: IdentityDocument[] = [];
let verificationHistory: VerificationHistory[] = [];

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to add verification history
const addVerificationHistory = (
  userId: string,
  action: VerificationHistory['action'],
  performedBy: string,
  reason?: string,
  details?: any
): VerificationHistory => {
  const historyItem: VerificationHistory = {
    id: generateId(),
    action,
    performedBy,
    reason,
    details,
    timestamp: new Date().toISOString()
  };
  verificationHistory.push(historyItem);
  return historyItem;
};

// GET /api/compliance/kyc - Get KYC status for authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Find existing KYC profile
    const kycProfile = kycProfiles.find(profile => profile.userId === userId);
    
    if (!kycProfile) {
      // Create initial KYC profile if doesn't exist
      const newProfile: KYCProfile = {
        id: generateId(),
        userId,
        status: 'pending',
        verificationLevel: 'basic',
        personalInfo: {} as PersonalInfo,
        addressInfo: {} as AddressInfo,
        identityDocuments: [],
        verificationHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      kycProfiles.push(newProfile);
      addVerificationHistory(userId, 'submitted', 'system', 'Initial profile created');
      
      return NextResponse.json<ApiResponse<KYCProfile>>({
        success: true,
        data: newProfile,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json<ApiResponse<KYCProfile>>({
      success: true,
      data: kycProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('KYC GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve KYC information'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/kyc - Submit KYC application
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const body = await request.json();
    const { personalInfo, addressInfo, documents: uploadedDocuments } = body;

    // Validate required fields
    if (!personalInfo || !addressInfo) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Personal information and address information are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate personal information
    const requiredPersonalFields = ['firstName', 'lastName', 'dateOfBirth', 'placeOfBirth', 'nationality', 'phoneNumber', 'email'];
    for (const field of requiredPersonalFields) {
      if (!personalInfo[field]) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing required field: ${field}`
          },
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
    }

    // Validate address information
    const requiredAddressFields = ['street', 'city', 'state', 'postalCode', 'country'];
    for (const field of requiredAddressFields) {
      if (!addressInfo[field]) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing required address field: ${field}`
          },
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
    }

    // Find or create KYC profile
    let kycProfile = kycProfiles.find(profile => profile.userId === userId);
    
    if (!kycProfile) {
      kycProfile = {
        id: generateId(),
        userId,
        status: 'pending',
        verificationLevel: 'basic',
        personalInfo: personalInfo as PersonalInfo,
        addressInfo: addressInfo as AddressInfo,
        identityDocuments: [],
        verificationHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      kycProfiles.push(kycProfile);
    } else {
      // Update existing profile
      kycProfile.personalInfo = personalInfo as PersonalInfo;
      kycProfile.addressInfo = addressInfo as AddressInfo;
      kycProfile.updatedAt = new Date().toISOString();
    }

    // Process uploaded documents
    if (uploadedDocuments && Array.isArray(uploadedDocuments)) {
      const processedDocuments: IdentityDocument[] = [];

      for (const docData of uploadedDocuments) {
        const document: IdentityDocument = {
          id: generateId(),
          type: docData.type,
          documentNumber: docData.documentNumber,
          issueDate: docData.issueDate,
          expiryDate: docData.expiryDate,
          issuingAuthority: docData.issuingAuthority,
          fileUrl: docData.fileUrl,
          fileHash: docData.fileHash || generateId(),
          status: 'pending',
          verifiedAt: undefined,
          rejectionReason: undefined
        };
        
        processedDocuments.push(document);
        documents.push(document);
        kycProfile.identityDocuments.push(document);
      }
    }

    // Add verification history
    addVerificationHistory(userId, 'submitted', userId, 'KYC application submitted');
    
    // Auto-advance status based on completeness
    if (kycProfile.identityDocuments.length >= 2) {
      kycProfile.status = 'in_review';
      addVerificationHistory(userId, 'review_started', 'system', 'Auto-review started after document submission');
    }

    kycProfile.updatedAt = new Date().toISOString();

    return NextResponse.json<ApiResponse<KYCProfile>>({
      success: true,
      data: kycProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('KYC POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit KYC application'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/kyc - Update KYC status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    const adminRole = request.headers.get('admin-role');
    
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for status updates'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, status, verificationLevel, reviewNotes } = body;

    if (!targetUserId || !status) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Target user ID and status are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const kycProfile = kycProfiles.find(profile => profile.userId === targetUserId);
    
    if (!kycProfile) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'KYC profile not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Validate status transitions
    const validStatuses: KYCProfile['status'][] = ['pending', 'in_review', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status value'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Update KYC profile
    const oldStatus = kycProfile.status;
    kycProfile.status = status;
    
    if (verificationLevel) {
      const validLevels: KYCProfile['verificationLevel'][] = ['basic', 'intermediate', 'advanced'];
      if (validLevels.includes(verificationLevel)) {
        kycProfile.verificationLevel = verificationLevel;
      }
    }

    kycProfile.updatedAt = new Date().toISOString();

    // Set expiry date for approved profiles
    if (status === 'approved') {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity
      kycProfile.expiresAt = expiryDate.toISOString();
    }

    // Add verification history
    addVerificationHistory(targetUserId, status as VerificationHistory['action'], userId, reviewNotes);

    return NextResponse.json<ApiResponse<KYCProfile>>({
      success: true,
      data: kycProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('KYC PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update KYC status'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE /api/compliance/kyc - Delete KYC profile (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    const adminRole = request.headers.get('admin-role');
    
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for deletion'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Find and remove KYC profile
    const profileIndex = kycProfiles.findIndex(profile => profile.userId === targetUserId);
    
    if (profileIndex === -1) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'KYC profile not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const deletedProfile = kycProfiles.splice(profileIndex, 1)[0];

    // Remove associated documents
    const docIndices = documents
      .map((doc, index) => ({ doc, index }))
      .filter(item => deletedProfile.identityDocuments.some(profileDoc => profileDoc.id === item.doc.id))
      .map(item => item.index)
      .sort((a, b) => b - a); // Sort in descending order for safe deletion

    for (const index of docIndices) {
      documents.splice(index, 1);
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('KYC DELETE error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete KYC profile'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}