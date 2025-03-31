import { supabase, updateLeaderboard } from '@/utils/supabase';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { abi as ERC721ABI } from '@/utils/erc721-abi'; // You'll need to create this file with the ABI

// Debug flag to control verbose logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Primos NFT contract address
export const PRIMOS_NFT_CONTRACT = '0x23924869ff64ab205b3e3be388a373d75de74ebd';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | boolean;
    display_type?: string;
  }[];
}

/**
 * Synchronizes user NFTs between the blockchain and the database
 * Gets current NFTs from the blockchain, compares them with those in the database,
 * and removes those that are no longer in the user's wallet.
 */
export async function fetchUserNFTs(provider: Web3Provider, walletAddress: string) {
  try {
    console.log(`⚡ START: Fetching NFTs for wallet: ${walletAddress}`);
    
    // STEP 1: VERIFY EXISTING NFTS IN DATABASE
    const { data: existingNfts, error: existingError } = await supabase
      .from('nfts')
      .select('token_id, contract_address, rarity, bonus_points')
      .eq('wallet_address', walletAddress.toLowerCase());
    
    if (existingError) {
      console.error('Error checking existing NFTs:', existingError);
    } else {
      console.log(`🔍 EXISTING DB STATE: Found ${existingNfts?.length || 0} NFTs in database for wallet ${walletAddress.toLowerCase()}`);
      if (existingNfts && existingNfts.length > 0) {
        const totalBonusPoints = existingNfts.reduce((sum, nft) => sum + (nft.bonus_points || 0), 0);
        console.log(`⚠️ DB STATE DETAILS: Total bonus points before cleanup: ${totalBonusPoints}`);
        if (DEBUG_MODE) {
          existingNfts.forEach(nft => {
            console.log(`   - NFT #${nft.token_id}: ${nft.rarity || 'unknown'} (${nft.bonus_points || 0} points)`);
          });
        }
      }
    }
    
    // STEP 2: AGGRESSIVELY CLEAN ALL NFTS FOR THIS WALLET
    console.log(`🧹 CLEANUP: Removing ALL existing NFTs for wallet ${walletAddress.toLowerCase()}...`);
    
    // First deletion pass
    const { error: cleanError1 } = await supabase
      .from('nfts')
      .delete()
      .eq('wallet_address', walletAddress.toLowerCase());
    
    if (cleanError1) {
      console.error('❌ CLEANUP ERROR (first attempt):', cleanError1);
      // Try to continue despite the error
    }
    
    // Verify that the deletion was successful
    const { data: remainingNfts, error: checkError } = await supabase
      .from('nfts')
      .select('count')
      .eq('wallet_address', walletAddress.toLowerCase());
    
    if (checkError) {
      console.error('Error verifying cleanup:', checkError);
    } else {
      const count = remainingNfts?.[0]?.count || 0;
      console.log(`🔍 CLEANUP VERIFICATION: ${count} NFTs remain in database after cleanup`);
      
      // If NFTs still remain, try to delete them again
      if (count > 0) {
        console.log(`⚠️ WARNING: First cleanup incomplete, attempting second cleanup...`);
        
        // Second deletion pass to ensure complete cleanup
        const { error: cleanError2 } = await supabase
          .from('nfts')
          .delete()
          .eq('wallet_address', walletAddress.toLowerCase());
        
        if (cleanError2) {
          console.error('❌ CLEANUP ERROR (second attempt):', cleanError2);
        } else {
          console.log(`✅ SECOND CLEANUP complete`);
        }
      }
    }
    
    // Small pause to ensure deletion completes before continuing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // STEP 3: GET FRESH NFTS FROM THE BLOCKCHAIN
    const contract = new ethers.Contract(PRIMOS_NFT_CONTRACT, ERC721ABI, provider);
    
    // Get NFT balance
    const balance = await contract.balanceOf(walletAddress);
    const balanceNum = balance.toNumber();
    
    console.log(`Found ${balanceNum} NFTs in blockchain for wallet ${walletAddress}`);
    
    // Prepare arrays to store the data
    const blockchainNFTIds: number[] = [];
    const nfts = [];
    
    // Iterate over all NFTs and get their IDs
    for (let i = 0; i < balanceNum; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
      const tokenIdNum = tokenId.toNumber();
      blockchainNFTIds.push(tokenIdNum);
      
      // Try to get the token URI
      const tokenURI = await contract.tokenURI(tokenId);
      
      // Get metadata (this depends on how your contract is implemented)
      let metadata: NFTMetadata | null = null;
      
      if (tokenURI) {
        try {
          // If the URI is an IPFS or HTTPS link
          if (tokenURI.startsWith('ipfs://')) {
            const ipfsHash = tokenURI.replace('ipfs://', '');
            const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
            metadata = await response.json();
          } else if (tokenURI.startsWith('http')) {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }
        } catch (err) {
          console.error(`Error fetching metadata for token ${tokenIdNum}:`, err);
        }
      }
      
      // Calculate bonus points based on metadata
      let bonusPoints = 0;
      let rarity = '';
      let isShiny = false;
      let isZ = false;
      let isFullSet = false;
      
      if (DEBUG_MODE) {
        console.log(`Processing metadata for NFT #${tokenIdNum}:`, metadata);
      }
      
      if (metadata?.attributes) {
        if (DEBUG_MODE) {
          console.log(`Attributes for NFT #${tokenIdNum}:`, metadata.attributes);
        }
        
        // Determine rarity
        const rarityAttr = metadata.attributes.find(attr => attr.trait_type === 'Rarity');
        if (rarityAttr) {
          rarity = rarityAttr.value as string;
          if (DEBUG_MODE) {
            console.log(`Found rarity for NFT #${tokenIdNum}: "${rarity}"`);
          }
          
          // Calculate bonus points based on rarity
          if (rarity === 'unique') {
            bonusPoints += 30;
            if (DEBUG_MODE) console.log(`  → +30 points for unique rarity`);
          }
          else if (rarity === 'shiny Z') {
            bonusPoints += 13;
            isShiny = true;
            isZ = true;
            if (DEBUG_MODE) console.log(`  → +13 points for shiny Z rarity`);
          }
          else if (rarity === 'shiny') {
            bonusPoints += 7;
            isShiny = true;
            if (DEBUG_MODE) console.log(`  → +7 points for shiny rarity`);
          }
          else if (rarity === 'original Z') {
            bonusPoints += 4;
            isZ = true;
            if (DEBUG_MODE) console.log(`  → +4 points for original Z rarity`);
          }
          else if (rarity === 'original') {
            bonusPoints += 1;
            if (DEBUG_MODE) console.log(`  → +1 point for original rarity`);
          }
        } else {
          console.log(`⚠️ No rarity attribute found for NFT #${tokenIdNum}`);
        }
        
        // Check if it has full set
        const fullSetAttr = metadata.attributes.find(attr => attr.trait_type === 'Full Set');
        if (fullSetAttr && fullSetAttr.value === true) {
          bonusPoints += 2;
          isFullSet = true;
          if (DEBUG_MODE) console.log(`  → +2 points for Full Set attribute`);
        }
      } else {
        console.log(`⚠️ No attributes found in metadata for NFT #${tokenIdNum}`);
      }
      
      if (DEBUG_MODE) {
        console.log(`Final calculation for NFT #${tokenIdNum}: ${bonusPoints} bonus points (rarity: ${rarity}, shiny: ${isShiny}, Z: ${isZ}, fullSet: ${isFullSet})`);
      }
      
      // Save or update the NFT in the database
      const { data, error } = await supabase
        .from('nfts')
        .upsert(
          {
            token_id: tokenIdNum,
            wallet_address: walletAddress.toLowerCase(),
            contract_address: PRIMOS_NFT_CONTRACT.toLowerCase(),
            rarity,
            is_shiny: isShiny,
            is_z: isZ,
            is_full_set: isFullSet,
            bonus_points: bonusPoints,
            metadata: metadata || {},
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'token_id,contract_address'
          }
        )
        .select();
      
      if (error) throw error;
      
      nfts.push({
        tokenId: tokenIdNum,
        metadata,
        bonusPoints,
        rarity,
        isShiny,
        isZ,
        isFullSet
      });
    }
    
    // Now we will insert (or reinsert) all current NFTs from the blockchain
    console.log(`Adding/updating ${blockchainNFTIds.length} current NFTs from blockchain to database`);
    
    try {
      const totalBonusPoints = nfts.reduce((sum, nft) => sum + nft.bonusPoints, 0);
      await updateLeaderboardNFTData(walletAddress, nfts.length, totalBonusPoints);
    } catch (error) {
      console.error('Error updating leaderboard NFT data:', error);
    }
    
    return { success: true, nfts };
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return { success: false, error };
  }
}

// Variable global para evitar mostrar el mensaje de advertencia múltiples veces
let warnMessageShown = false;

export async function calculateNFTPoints(walletAddress: string) {
  try {
    console.log(`Calculando NFTs elegibles para wallet ${walletAddress}`);
    
    // Get all of the user's NFTs
    const { data: nfts, error } = await supabase
      .from('nfts')
      .select('token_id, contract_address, bonus_points')
      .eq('wallet_address', walletAddress.toLowerCase());
    
    if (error) throw error;
    
    // Get NFTs already used today by ANY wallet - use UTC date for consistency
    const utcDate = new Date();
    const today = new Date(Date.UTC(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate()
    )).toISOString().split('T')[0]; // Format YYYY-MM-DD in UTC
    
    console.log(`Verificando NFTs para fecha UTC ${today}`);
    
    // Verificar si hay check-ins hechos hoy por este wallet
    const { data: checkInsToday, error: checkInError } = await supabase
      .from('check_ins')
      .select('id, created_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`);
    
    let alreadyCheckedInToday = false;
    
    if (checkInError) {
      console.error('Error al verificar check-ins de hoy:', checkInError);
    } else {
      // Si ya hay un check-in hoy, verificar si hay NFTs registrados para ese check-in
      if (checkInsToday && checkInsToday.length > 0) {
        alreadyCheckedInToday = true;
        
        const checkInIds = checkInsToday.map(checkIn => checkIn.id);
        
        // Verificar si hay NFTs registrados para esos check-ins
        const { data: checkInNfts, error: checkInNftsError } = await supabase
          .from('nft_usage_tracking')
          .select('token_id, contract_address, check_in_id')
          .in('check_in_id', checkInIds);
        
        if (checkInNftsError) {
          console.error('Error al verificar NFTs usados en check-ins de hoy:', checkInNftsError);
        } else {
          // Si no hay NFTs registrados para los check-ins de hoy, es posible que hayan fallado
          // en registrarse. Marcar todos los NFTs como no elegibles.
          if (checkInNfts && checkInNfts.length === 0 && nfts && nfts.length > 0) {
            if (!warnMessageShown) {
              console.warn('Se encontraron check-ins de hoy pero sin NFTs registrados. Todos los NFTs serán marcados como no elegibles.');
              warnMessageShown = true;
            }
            return { success: true, totalPoints: 0, eligibleNfts: [] };
          }
        }
      }
    }
    
    // Fecha formateada explícitamente para máxima compatibilidad
    const todayFormatted = today;
    if (DEBUG_MODE) {
      console.log("VERIFICANDO CON FECHA EXACTA:", todayFormatted);
      console.log(`VALOR EXACTO DE todayFormatted: "${todayFormatted}" (${typeof todayFormatted})`);
    }
    
    // Consulta directa sin filtrado para ver registros recientes
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('nft_usage_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (DEBUG_MODE) {
      console.log("REGISTROS RECIENTES (muestra):", allRecords?.length || 0);
    }
    
    if (allRecordsError) {
      console.error('Error al consultar registros recientes:', allRecordsError);
    }
    
    // Obtener NFTs usados hoy con fecha explícita
    const { data: usedNfts, error: usedError } = await supabase
      .from('nft_usage_tracking')
      .select('*')
      .eq('usage_date', todayFormatted);
    
    if (usedError) {
      console.error('Error al verificar NFTs usados:', usedError);
      throw usedError;
    }
    
    if (DEBUG_MODE) {
      console.log(`NFTs usados hoy (${todayFormatted}):`, usedNfts?.length || 0);
    }
    
    // Verificación adicional con formato alternativo
    const utcDateString = new Date().toISOString().split('T')[0];
    const { data: usedNftsAlt, error: usedErrorAlt } = await supabase
      .from('nft_usage_tracking')
      .select('*')
      .eq('usage_date', utcDateString);
      
    if (DEBUG_MODE && usedNftsAlt && usedNftsAlt.length > 0) {
      console.log(`NFTs usados con formato alternativo (${utcDateString}):`, usedNftsAlt.length);
    }
    
    // Verificación manual para mayor consistencia
    const blockedNfts = allRecords?.filter(record => {
      // Comparar la fecha con todas las variantes posibles
      const recordDate = record.usage_date;
      const matchesToday = (
        recordDate === todayFormatted || 
        recordDate === utcDateString ||
        recordDate.startsWith(todayFormatted) ||
        recordDate.startsWith(utcDateString)
      );
      
      return matchesToday;
    }) || [];
    
    // Crear un conjunto de token_ids usados (convertidos a STRING para consistencia)
    const usedTokenIdSet = new Set();
    
    // Añadir NFTs bloqueados a un conjunto para eliminar duplicados
    [...(usedNfts || []), ...(usedNftsAlt || []), ...blockedNfts].forEach(nft => {
      if (nft) {
        // Convertir siempre a string para eliminar problemas de tipo
        const tokenIdAsString = String(nft.token_id);
        usedTokenIdSet.add(tokenIdAsString);
        // Eliminamos este log que causa miles de mensajes
        // console.log(`NFT BLOQUEADO: #${tokenIdAsString}`);
      }
    });
    
    // Se eliminó el código de tratamiento especial para NFT #216
    
    console.log(`NFTs bloqueados: ${usedTokenIdSet.size} encontrados`);
    
    // Si el usuario ya ha hecho check-in hoy, todos sus NFTs se consideran usados
    if (alreadyCheckedInToday && nfts) {
      console.log(`El usuario ya hizo check-in hoy. Sus ${nfts.length} NFTs se consideran usados.`);
      return { success: true, totalPoints: 0, eligibleNfts: [] };
    }
    
    // Filtro simple con conversión de tipos consistente
    const eligibleNfts = nfts?.filter(nft => {
      // Siempre convertir a string para comparación consistente
      const tokenIdAsString = String(nft.token_id);
      
      // Un NFT está bloqueado si su ID (como string) está en el conjunto
      const isBlocked = usedTokenIdSet.has(tokenIdAsString);
      
      // Solo mostramos estos logs para los NFTs del usuario, no para todos
      if (DEBUG_MODE) {
        if (isBlocked) {
          console.log(`🚫 NFT #${nft.token_id} - No disponible hoy`);
        } else {
          console.log(`✅ NFT #${nft.token_id} - Disponible para usar hoy`);
        }
      }
      
      // Solo es elegible si NO está bloqueado
      return !isBlocked;
    }) || [];
    
    console.log(`NFTs elegibles para check-in: ${eligibleNfts.length} de ${nfts?.length || 0} total`);
    
    const totalPoints = eligibleNfts.reduce((sum, nft) => sum + (nft.bonus_points || 0), 0);
    console.log(`Puntos totales de NFTs elegibles: ${totalPoints}`);
    
    return { 
      success: true, 
      totalPoints,
      eligibleNfts // Return eligible NFTs to use in the registry
    };
  } catch (error) {
    console.error('Error calculating NFT points:', error);
    return { success: false, error, totalPoints: 0, eligibleNfts: [] };
  }
}


export async function updateLeaderboardNFTData(walletAddress: string, nftCount: number, totalBonusPoints: number) {
  try {
    // Usar la función centralizada para actualizar el leaderboard
    const result = await updateLeaderboard(walletAddress, {
      nft_count: nftCount,
      last_active: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    console.error('Error updating leaderboard NFT data:', error);
    return { success: false, error };
  }
}
