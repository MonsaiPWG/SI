import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ethers } from 'ethers';

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
    
    // Obtener todas las evoluciones del usuario
    const { data: evolutions, error } = await supabase
      .from('evolutions')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ evolutions });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    // Extraer datos de la solicitud
    const body = await req.json();
    const { 
      walletAddress, 
      primoTokenId, 
      stoneType, 
      stoneTokenId, 
      transactionHash,
      metadata 
    } = body;
    
    // Validar datos obligatorios
    if (!walletAddress || !primoTokenId || !stoneType || !stoneTokenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validar que la dirección sea válida
    if (!ethers.utils.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }
    
    // Registrar la evolución
    const { data, error } = await supabase
      .from('evolutions')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        primo_token_id: primoTokenId,
        stone_type: stoneType,
        stone_token_id: stoneTokenId,
        status: 'pending',
        transaction_hash: transactionHash,
        metadata: metadata || {},
        estimated_completion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      evolution: data,
      message: 'Evolution process started successfully' 
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}