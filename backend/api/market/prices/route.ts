import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';

// GET /api/market/prices - Get real-time prices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const symbols = searchParams.get('symbols')?.split(',');

    // Default trading pairs
    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'XRPUSDT', 'BCHUSDT'];

    let symbolsToFetch: string[] = [];
    if (symbol) {
      symbolsToFetch = [symbol];
    } else if (symbols) {
      symbolsToFetch = symbols;
    } else {
      symbolsToFetch = defaultSymbols;
    }

    const pricesData: any = {};

    // In a real implementation, you would fetch from a real-time market data API
    // For now, we'll simulate with realistic prices
    const marketPrices = {
      'BTCUSDT': {
        symbol: 'BTCUSDT',
        price: 67850.32,
        change24h: 2.45,
        changePercent: 0.0367,
        volume24h: 28475692847,
        high24h: 68500.15,
        low24h: 66432.88,
        timestamp: Date.now(),
      },
      'ETHUSDT': {
        symbol: 'ETHUSDT',
        price: 3456.78,
        change24h: -45.23,
        changePercent: -0.0129,
        volume24h: 15623456789,
        high24h: 3489.65,
        low24h: 3421.34,
        timestamp: Date.now(),
      },
      'BNBUSDT': {
        symbol: 'BNBUSDT',
        price: 612.45,
        change24h: 12.67,
        changePercent: 0.0211,
        volume24h: 2345678901,
        high24h: 618.90,
        low24h: 598.23,
        timestamp: Date.now(),
      },
    };

    symbolsToFetch.forEach(sym => {
      if (marketPrices[sym]) {
        pricesData[sym] = marketPrices[sym];
      } else {
        // Generate realistic price for other symbols
        const basePrice = Math.random() * 1000 + 1;
        const change = (Math.random() - 0.5) * basePrice * 0.1;
        pricesData[sym] = {
          symbol: sym,
          price: Math.round((basePrice + change) * 100) / 100,
          change24h: Math.round(change * 100) / 100,
          changePercent: Math.round((change / basePrice) * 10000) / 100,
          volume24h: Math.floor(Math.random() * 1000000000),
          high24h: Math.round((basePrice + change * 1.5) * 100) / 100,
          low24h: Math.round((basePrice - Math.abs(change * 0.5)) * 100) / 100,
          timestamp: Date.now(),
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        prices: pricesData,
        timestamp: new Date().toISOString(),
        symbols: symbolsToFetch,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get market prices error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy dữ liệu giá',
    }, { status: 500 });
  }
}

// GET /api/market/orderbook/:symbol - Get order book data
export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Generate realistic order book data
    const basePrice = Math.random() * 50000 + 1000;
    const orderBook: any = {
      symbol,
      bids: [],
      asks: [],
      lastUpdateId: Date.now(),
    };

    // Generate bids (buy orders)
    for (let i = 0; i < limit; i++) {
      const price = Math.round((basePrice - (i * basePrice * 0.001)) * 100) / 100;
      const quantity = Math.round((Math.random() * 10 + 0.1) * 1000) / 1000;
      orderBook.bids.push({
        price,
        quantity,
        total: Math.round(price * quantity * 100) / 100,
      });
    }

    // Generate asks (sell orders)
    for (let i = 0; i < limit; i++) {
      const price = Math.round((basePrice + (i * basePrice * 0.001)) * 100) / 100;
      const quantity = Math.round((Math.random() * 10 + 0.1) * 1000) / 1000;
      orderBook.asks.push({
        price,
        quantity,
        total: Math.round(price * quantity * 100) / 100,
      });
    }

    // Sort order book (bids descending, asks ascending)
    orderBook.bids.sort((a: any, b: any) => b.price - a.price);
    orderBook.asks.sort((a: any, b: any) => a.price - b.price);

    return NextResponse.json({
      success: true,
      data: orderBook,
    }, { status: 200 });

  } catch (error) {
    console.error('Get order book error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy dữ liệu sổ lệnh',
    }, { status: 500 });
  }
}

// GET /api/market/trade-history/:symbol - Get trade history
export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const { symbol } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const trades: any[] = [];
    const basePrice = Math.random() * 50000 + 1000;
    
    for (let i = 0; i < limit; i++) {
      const priceVariation = (Math.random() - 0.5) * basePrice * 0.01;
      const price = Math.round((basePrice + priceVariation) * 100) / 100;
      const quantity = Math.round((Math.random() * 5 + 0.1) * 1000) / 1000;
      const isBuyer = Math.random() > 0.5;
      
      trades.push({
        id: `trade_${Date.now()}_${i}`,
        price,
        quantity,
        time: Date.now() - (i * Math.random() * 10000),
        timestamp: new Date(Date.now() - (i * Math.random() * 10000)).toISOString(),
        isBuyerMaker: !isBuyer,
        isBestMatch: Math.random() > 0.7,
      });
    }

    // Sort by time (newest first)
    trades.sort((a, b) => b.time - a.time);

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        trades,
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get trade history error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy lịch sử giao dịch',
    }, { status: 500 });
  }
}