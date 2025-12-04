// Sanctions Screening API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Real-time sanctions list screening and PEP (Politically Exposed Persons) checking

import { NextRequest, NextResponse } from 'next/server';
import {
  ApiResponse,
  PaginatedResponse,
  AMLFinding
} from '../../../../shared/types/risk-compliance';

// Sanctions list entry interface
interface SanctionsEntry {
  id: string;
  name: string;
  aliases?: string[];
  dateOfBirth?: string;
  nationality?: string;
  country?: string;
  program: string; // Sanctions program (e.g., OFAC, EU, UN)
  listType: 'sanctions' | 'watchlist' | 'unverified';
  entityType: 'individual' | 'entity' | 'vessel' | 'aircraft';
  lastUpdated: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  address?: string;
  identification?: string;
  remarks?: string;
}

// PEP (Politically Exposed Persons) entry interface
interface PEPEntry {
  id: string;
  name: string;
  aliases?: string[];
  position: string;
  organization: string;
  country: string;
  region: string;
  pepType: 'domestic' | 'foreign' | 'member_international_org';
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
  source: string;
  verificationStatus: 'verified' | 'pending' | 'expired';
  familyMembers?: string[];
  closeAssociates?: string[];
}

// Watchlist entry interface
interface WatchlistEntry {
  id: string;
  name: string;
  listType: 'wanted' | 'fraud' | 'terrorism' | 'organized_crime' | 'corruption';
  jurisdiction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  lastUpdated: string;
}

// Screening result interface
interface ScreeningResult {
  id: string;
  timestamp: string;
  queryName: string;
  queryType: 'individual' | 'entity' | 'both';
  results: {
    sanctionsMatches: SanctionsEntry[];
    pepMatches: PEPEntry[];
    watchlistMatches: WatchlistEntry[];
    fuzzyMatches: {
      sanctions: { entry: SanctionsEntry; score: number }[];
      pep: { entry: PEPEntry; score: number }[];
      watchlist: { entry: WatchlistEntry; score: number }[];
    };
  };
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  requiresReview: boolean;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'pending' | 'reviewing' | 'cleared' | 'flagged' | 'escalated';
}

// In-memory storage (in production, use database)
let sanctionsLists: SanctionsEntry[] = [];
let pepDatabase: PEPEntry[] = [];
let watchlists: WatchlistEntry[] = [];
let screeningResults: ScreeningResult[] = [];

// Initialize with sample data (in production, would load from external sources)
const initializeSanctionsData = () => {
  // Sample sanctions list entries
  sanctionsLists = [
    {
      id: 'san-001',
      name: 'John Smith',
      aliases: ['J. Smith', 'Johnny Smith'],
      nationality: 'US',
      country: 'US',
      program: 'OFAC SDN',
      listType: 'sanctions',
      entityType: 'individual',
      lastUpdated: '2025-01-15T00:00:00Z',
      riskLevel: 'critical',
      remarks: 'Specially Designated National'
    },
    {
      id: 'san-002',
      name: 'ABC Corporation',
      aliases: ['ABC Corp', 'American Business Co'],
      country: 'RU',
      program: 'OFAC SDN',
      listType: 'sanctions',
      entityType: 'entity',
      lastUpdated: '2025-01-10T00:00:00Z',
      riskLevel: 'high',
      remarks: 'Owned by sanctioned entity'
    },
    {
      id: 'san-003',
      name: 'Jane Doe',
      program: 'EU Sanctions',
      listType: 'watchlist',
      entityType: 'individual',
      lastUpdated: '2025-01-20T00:00:00Z',
      riskLevel: 'medium'
    }
  ];

  // Sample PEP database entries
  pepDatabase = [
    {
      id: 'pep-001',
      name: 'Minister John Government',
      position: 'Minister of Finance',
      organization: 'Government of CountryX',
      country: 'CountryX',
      region: 'Asia',
      pepType: 'foreign',
      riskLevel: 'high',
      lastUpdated: '2025-01-01T00:00:00Z',
      source: 'Government Database',
      verificationStatus: 'verified'
    },
    {
      id: 'pep-002',
      name: 'Senator Jane Politics',
      position: 'Senator',
      organization: 'Senate',
      country: 'US',
      region: 'North America',
      pepType: 'domestic',
      riskLevel: 'medium',
      lastUpdated: '2025-01-05T00:00:00Z',
      source: 'Congress Database',
      verificationStatus: 'verified'
    },
    {
      id: 'pep-003',
      name: 'Ambassador Robert International',
      position: 'Ambassador',
      organization: 'UN',
      country: 'International',
      region: 'Global',
      pepType: 'member_international_org',
      riskLevel: 'medium',
      lastUpdated: '2025-01-08T00:00:00Z',
      source: 'UN Database',
      verificationStatus: 'verified'
    }
  ];

  // Sample watchlist entries
  watchlists = [
    {
      id: 'watch-001',
      name: 'Fraudster Frank',
      listType: 'fraud',
      jurisdiction: 'US',
      severity: 'high',
      description: 'Wanted for securities fraud',
      lastUpdated: '2025-01-12T00:00:00Z'
    },
    {
      id: 'watch-002',
      name: 'Terrorist Organization',
      listType: 'terrorism',
      jurisdiction: 'International',
      severity: 'critical',
      description: 'Designated terrorist organization',
      lastUpdated: '2025-01-18T00:00:00Z'
    }
  ];
};

// Initialize data on module load
initializeSanctionsData();

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function for fuzzy name matching
const calculateNameSimilarity = (name1: string, name2: string): number => {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match
  if (n1 === n2) return 100;
  
  // Check if one name contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 80;
  
  // Check for common words
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  const similarity = (commonWords.length / Math.max(words1.length, words2.length)) * 100;
  
  return Math.max(similarity, 50); // Minimum 50% for partial matches
};

// Helper function to search sanctions lists
const searchSanctionsLists = (name: string): {
  exactMatches: SanctionsEntry[];
  fuzzyMatches: { entry: SanctionsEntry; score: number }[];
} => {
  const exactMatches: SanctionsEntry[] = [];
  const fuzzyMatches: { entry: SanctionsEntry; score: number }[] = [];
  
  for (const entry of sanctionsLists) {
    // Check exact name match
    if (entry.name.toLowerCase() === name.toLowerCase()) {
      exactMatches.push(entry);
      continue;
    }
    
    // Check aliases
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (alias.toLowerCase() === name.toLowerCase()) {
          exactMatches.push(entry);
          break;
        }
      }
    }
    
    // Calculate similarity score for fuzzy matching
    const similarity = calculateNameSimilarity(name, entry.name);
    if (similarity >= 70) {
      fuzzyMatches.push({ entry, score: similarity });
    }
    
    // Also check aliases for fuzzy matching
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const aliasSimilarity = calculateNameSimilarity(name, alias);
        if (aliasSimilarity >= 70) {
          fuzzyMatches.push({ entry, score: aliasSimilarity });
        }
      }
    }
  }
  
  // Remove duplicates from fuzzy matches
  const uniqueFuzzyMatches = fuzzyMatches.filter((match, index, self) => 
    index === self.findIndex(m => m.entry.id === match.entry.id)
  ).sort((a, b) => b.score - a.score);
  
  return { exactMatches, fuzzyMatches: uniqueFuzzyMatches };
};

// Helper function to search PEP database
const searchPEPDatabase = (name: string): {
  exactMatches: PEPEntry[];
  fuzzyMatches: { entry: PEPEntry; score: number }[];
} => {
  const exactMatches: PEPEntry[] = [];
  const fuzzyMatches: { entry: PEPEntry; score: number }[] = [];
  
  for (const entry of pepDatabase) {
    // Check exact name match
    if (entry.name.toLowerCase() === name.toLowerCase()) {
      exactMatches.push(entry);
      continue;
    }
    
    // Check aliases
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (alias.toLowerCase() === name.toLowerCase()) {
          exactMatches.push(entry);
          break;
        }
      }
    }
    
    // Calculate similarity score for fuzzy matching
    const similarity = calculateNameSimilarity(name, entry.name);
    if (similarity >= 70) {
      fuzzyMatches.push({ entry, score: similarity });
    }
    
    // Also check aliases for fuzzy matching
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const aliasSimilarity = calculateNameSimilarity(name, alias);
        if (aliasSimilarity >= 70) {
          fuzzyMatches.push({ entry, score: aliasSimilarity });
        }
      }
    }
  }
  
  // Remove duplicates from fuzzy matches
  const uniqueFuzzyMatches = fuzzyMatches.filter((match, index, self) => 
    index === self.findIndex(m => m.entry.id === match.entry.id)
  ).sort((a, b) => b.score - a.score);
  
  return { exactMatches, fuzzyMatches: uniqueFuzzyMatches };
};

// Helper function to search watchlists
const searchWatchlists = (name: string): {
  exactMatches: WatchlistEntry[];
  fuzzyMatches: { entry: WatchlistEntry; score: number }[];
} => {
  const exactMatches: WatchlistEntry[] = [];
  const fuzzyMatches: { entry: WatchlistEntry; score: number }[] = [];
  
  for (const entry of watchlists) {
    // Check exact name match
    if (entry.name.toLowerCase() === name.toLowerCase()) {
      exactMatches.push(entry);
      continue;
    }
    
    // Calculate similarity score for fuzzy matching
    const similarity = calculateNameSimilarity(name, entry.name);
    if (similarity >= 70) {
      fuzzyMatches.push({ entry, score: similarity });
    }
  }
  
  return { exactMatches, fuzzyMatches };
};

// Helper function to determine overall risk
const determineOverallRisk = (
  sanctionsMatches: SanctionsEntry[],
  pepMatches: PEPEntry[],
  watchlistMatches: WatchlistEntry[]
): ScreeningResult['overallRisk'] => {
  // Critical risk if any sanctions match
  if (sanctionsMatches.some(match => match.riskLevel === 'critical')) {
    return 'critical';
  }
  
  // High risk if any sanctions match or high-risk watchlist match
  if (sanctionsMatches.length > 0 || watchlistMatches.some(match => match.severity === 'critical')) {
    return 'high';
  }
  
  // Medium risk if PEP matches or watchlist matches
  if (pepMatches.length > 0 || watchlistMatches.length > 0) {
    return 'medium';
  }
  
  return 'low';
};

// GET /api/compliance/sanctions - Search sanctions lists
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

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const program = searchParams.get('program');
    const listType = searchParams.get('listType');
    const riskLevel = searchParams.get('riskLevel');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!name) {
      // Return all sanctions if no name provided (for admin viewing)
      const adminRole = request.headers.get('admin-role');
      if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Name parameter required for sanctions search'
          },
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
      let filteredSanctions = [...sanctionsLists];
      
      if (program) {
        filteredSanctions = filteredSanctions.filter(s => s.program === program);
      }
      
      if (listType) {
        filteredSanctions = filteredSanctions.filter(s => s.listType === listType);
      }
      
      if (riskLevel) {
        filteredSanctions = filteredSanctions.filter(s => s.riskLevel === riskLevel);
      }
      
      // Sort by risk level and name
      filteredSanctions.sort((a, b) => {
        const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        return a.name.localeCompare(b.name);
      });
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSanctions = filteredSanctions.slice(startIndex, endIndex);
      
      const response: PaginatedResponse<SanctionsEntry> = {
        data: paginatedSanctions,
        pagination: {
          page,
          limit,
          total: filteredSanctions.length,
          totalPages: Math.ceil(filteredSanctions.length / limit),
          hasNext: endIndex < filteredSanctions.length,
          hasPrevious: page > 1
        }
      };
      
      return NextResponse.json<ApiResponse<PaginatedResponse<SanctionsEntry>>>({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    }

    // Search for specific name
    const { exactMatches, fuzzyMatches } = searchSanctionsLists(name);
    
    // Filter results based on optional parameters
    let filteredExact = exactMatches;
    let filteredFuzzy = fuzzyMatches;
    
    if (program) {
      filteredExact = filteredExact.filter(s => s.program === program);
      filteredFuzzy = filteredFuzzy.filter(f => f.entry.program === program);
    }
    
    if (listType) {
      filteredExact = filteredExact.filter(s => s.listType === listType);
      filteredFuzzy = filteredFuzzy.filter(f => f.entry.listType === listType);
    }
    
    if (riskLevel) {
      filteredExact = filteredExact.filter(s => s.riskLevel === riskLevel);
      filteredFuzzy = filteredFuzzy.filter(f => f.entry.riskLevel === riskLevel);
    }

    const results = {
      exactMatches: filteredExact,
      fuzzyMatches: filteredFuzzy,
      searchQuery: name,
      totalMatches: filteredExact.length + filteredFuzzy.length
    };

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sanctions GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search sanctions lists'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/sanctions/screen - Perform comprehensive sanctions screening
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
    const { 
      name, 
      aliases, 
      dateOfBirth, 
      nationality, 
      country,
      queryType = 'individual'
    } = body;

    if (!name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required for sanctions screening'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Search all databases
    const sanctionsResults = searchSanctionsLists(name);
    const pepResults = searchPEPDatabase(name);
    const watchlistResults = searchWatchlists(name);
    
    // Also search using aliases if provided
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        const aliasSanctions = searchSanctionsLists(alias);
        const aliasPEP = searchPEPDatabase(alias);
        const aliasWatchlist = searchWatchlists(alias);
        
        // Merge results, avoiding duplicates
        sanctionsResults.exactMatches.push(...aliasSanctions.exactMatches.filter(
          newMatch => !sanctionsResults.exactMatches.some(existing => existing.id === newMatch.id)
        ));
        sanctionsResults.fuzzyMatches.push(...aliasSanctions.fuzzyMatches.filter(
          newMatch => !sanctionsResults.fuzzyMatches.some(existing => existing.entry.id === newMatch.entry.id)
        ));
        
        pepResults.exactMatches.push(...aliasPEP.exactMatches.filter(
          newMatch => !pepResults.exactMatches.some(existing => existing.id === newMatch.id)
        ));
        pepResults.fuzzyMatches.push(...aliasPEP.fuzzyMatches.filter(
          newMatch => !pepResults.fuzzyMatches.some(existing => existing.entry.id === newMatch.entry.id)
        ));
        
        watchlistResults.exactMatches.push(...aliasWatchlist.exactMatches.filter(
          newMatch => !watchlistResults.exactMatches.some(existing => existing.id === newMatch.id)
        ));
        watchlistResults.fuzzyMatches.push(...aliasWatchlist.fuzzyMatches.filter(
          newMatch => !watchlistResults.fuzzyMatches.some(existing => existing.entry.id === newMatch.entry.id)
        ));
      }
    }

    // Determine overall risk
    const overallRisk = determineOverallRisk(
      sanctionsResults.exactMatches,
      pepResults.exactMatches,
      watchlistResults.exactMatches
    );

    // Create screening result
    const screeningResult: ScreeningResult = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      queryName: name,
      queryType,
      results: {
        sanctionsMatches: sanctionsResults.exactMatches,
        pepMatches: pepResults.exactMatches,
        watchlistMatches: watchlistResults.exactMatches,
        fuzzyMatches: {
          sanctions: sanctionsResults.fuzzyMatches,
          pep: pepResults.fuzzyMatches,
          watchlist: watchlistResults.fuzzyMatches
        }
      },
      overallRisk,
      requiresReview: overallRisk === 'high' || overallRisk === 'critical',
      status: overallRisk === 'critical' ? 'escalated' : overallRisk === 'high' ? 'flagged' : 'cleared'
    };

    screeningResults.push(screeningResult);

    // Create AML findings for matches
    const findings: AMLFinding[] = [];
    
    // Add sanctions findings
    for (const match of sanctionsResults.exactMatches) {
      findings.push({
        category: 'sanctions',
        source: match.program,
        description: `Sanctions match found: ${match.name} (${match.program})`,
        severity: match.riskLevel === 'critical' ? 'high' : match.riskLevel,
        confidence: 95,
        actionTaken: match.riskLevel === 'critical' ? 'Immediate escalation required' : 'Flagged for review',
        timestamp: new Date().toISOString()
      });
    }
    
    // Add PEP findings
    for (const match of pepResults.exactMatches) {
      findings.push({
        category: 'pep',
        source: match.source,
        description: `PEP match found: ${match.name} (${match.position})`,
        severity: match.riskLevel,
        confidence: 90,
        actionTaken: 'Enhanced due diligence required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Add watchlist findings
    for (const match of watchlistResults.exactMatches) {
      findings.push({
        category: 'negative_news',
        source: `${match.listType} Watchlist`,
        description: `Watchlist match found: ${match.name} - ${match.description}`,
        severity: match.severity === 'critical' ? 'high' : match.severity,
        confidence: 85,
        actionTaken: 'Immediate review required',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json<ApiResponse<ScreeningResult>>({
      success: true,
      data: { ...screeningResult, findings },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sanctions screening POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform sanctions screening'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/sanctions/screenings - Get screening results
export async function GET_screenings(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const requiresReview = searchParams.get('requiresReview');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filteredResults = [...screeningResults];
    
    // Apply filters
    if (status) {
      filteredResults = filteredResults.filter(r => r.status === status);
    }
    
    if (riskLevel) {
      filteredResults = filteredResults.filter(r => r.overallRisk === riskLevel);
    }
    
    if (requiresReview !== null) {
      const requiresReviewBool = requiresReview === 'true';
      filteredResults = filteredResults.filter(r => r.requiresReview === requiresReviewBool);
    }
    
    // Sort by timestamp, newest first
    filteredResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<ScreeningResult> = {
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit),
        hasNext: endIndex < filteredResults.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<ScreeningResult>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Screening results GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve screening results'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/sanctions/screenings/:id - Update screening result (admin only)
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
          message: 'Admin privileges required for updating screening results'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const screeningId = searchParams.get('id');
    
    if (!screeningId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Screening ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, reviewerNotes } = body;

    const screeningResult = screeningResults.find(r => r.id === screeningId);
    
    if (!screeningResult) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Screening result not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update screening result
    if (status) {
      const validStatuses: ScreeningResult['status'][] = ['pending', 'reviewing', 'cleared', 'flagged', 'escalated'];
      if (validStatuses.includes(status)) {
        screeningResult.status = status;
      }
    }
    
    if (reviewerNotes) {
      screeningResult.reviewerNotes = reviewerNotes;
    }
    
    screeningResult.reviewedBy = userId;
    screeningResult.reviewedAt = new Date().toISOString();

    return NextResponse.json<ApiResponse<ScreeningResult>>({
      success: true,
      data: screeningResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Screening result PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update screening result'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}