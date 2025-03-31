import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  try {
    const url = new URL(req.url);
    const walletAddress = url.searchParams.get('wallet_address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Query all NFTs registered for this wallet address
    const { data: nfts, error: nftsError } = await supabase
      .from('nfts')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase());
      
    if (nftsError) {
      return NextResponse.json(
        { error: nftsError.message },
        { status: 500 }
      );
    }
    
    // Calculate total bonus points
    const totalBonusPoints = nfts?.reduce((sum: number, nft: any) => sum + (nft.bonus_points || 0), 0) || 0;
    
    return NextResponse.json({
      count: nfts?.length || 0,
      nfts: nfts || [],
      totalBonusPoints,
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verificar si un NFT específico está disponible para usar hoy
export async function POST(req: NextRequest) {
  try {
    const { token_id, contract_address } = await req.json();
    
    if (!token_id || !contract_address) {
      return NextResponse.json({ 
        error: 'token_id and contract_address are required' 
      }, { status: 400 });
    }
    
    // Verificar si el NFT ya fue usado hoy a nivel global (por cualquier wallet)
    const utcDate = new Date();
    const today = new Date(Date.UTC(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate()
    )).toISOString().split('T')[0]; // Format YYYY-MM-DD in UTC
    
    console.log(`Verificando NFT #${token_id} para fecha ${today}`);
    
    const supabase = await createClient();
    
    // Convertir token_id a string para garantizar consistencia
    const tokenIdAsString = String(token_id);
    const tokenIdAsNumber = Number(token_id);
    
    // Consulta directa sin filtrado para ver los registros recientes
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('nft_usage_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (allRecordsError) {
      console.error('Error al consultar registros recientes:', allRecordsError);
    }
    
    // Consulta general por fecha
    const { data: usedNfts, error: usedError } = await supabase
      .from('nft_usage_tracking')
      .select('*')
      .eq('usage_date', today);
    
    if (usedError) {
      console.error('Error verificando el uso del NFT:', usedError);
      return NextResponse.json({ error: 'Error verificando el uso del NFT' }, { status: 500 });
    }
    
    // VERIFICACIÓN MANUAL: Buscar en todos los registros recientes
    const blockedRecords = allRecords?.filter(record => {
      // Verificar si coincide el token_id (como string o número)
      const tokenIdMatch = 
        String(record.token_id) === tokenIdAsString || 
        Number(record.token_id) === tokenIdAsNumber;
      
      // Verificar si la fecha es hoy
      const dateMatch = 
        record.usage_date === today || 
        record.usage_date.startsWith(today);
      
      if (tokenIdMatch && dateMatch) {
        console.log(`Encontrado bloqueo: token_id=${record.token_id}, fecha=${record.usage_date}`);
      }
      
      return tokenIdMatch && dateMatch;
    }) || [];
    
    // Crear un conjunto de token_ids usados (todos convertidos a string)
    const usedTokenIdSet = new Set();
    
    // Añadir de ambas fuentes
    [...(usedNfts || []), ...blockedRecords].forEach(nft => {
      if (nft) {
        usedTokenIdSet.add(String(nft.token_id));
      }
    });
    
    // Verificación final
    const isUsed = usedTokenIdSet.has(tokenIdAsString);
    
    // Si está en el conjunto, significa que ya fue usado
    if (isUsed) {
      console.log(`NFT #${token_id} ya fue usado hoy`);
      return NextResponse.json({ 
        isUsed: true,
        message: 'Este NFT ya fue usado hoy y no estará disponible hasta las 00:00 UTC',
        usageData: usedNfts?.filter(nft => String(nft.token_id) === tokenIdAsString) || blockedRecords
      });
    }
    
    // Si no hay registros, está disponible para usar
    return NextResponse.json({ 
      isUsed: false,
      message: 'NFT disponible para usar hoy' 
    });
  } catch (err) {
    console.error('Error verificando NFT:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
