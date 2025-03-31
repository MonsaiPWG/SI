import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { supabase } from '@/utils/supabase';
import { FireDustABI } from '@/utils/token-abi';
import { PRIMOS_NFT_CONTRACT } from '@/services/nftService';
import { abi as ERC721ABI } from '@/utils/erc721-abi';
import { retryOperation } from '@/utils/retry-utils';

// Configuración de las piedras de evolución
export const EVOLUTION_STONES = {
  PRIMAL: {
    name: 'PRIMAL EvoZtone',
    contractAddress: '0xE3a334D6b7681D0151b81964CAf6353905e24B1b', // Usar mismo contrato que Fire Dust
    tokenId: 1, // ID del token para PRIMAL EvoZtone
    compatibleWith: ['original'],
    color: 'bg-red-500'
  },
  MOUNT_Y: {
    name: 'MOUNT-Y EvoZtone',
    contractAddress: '0xE3a334D6b7681D0151b81964CAf6353905e24B1b', // Usar mismo contrato que Fire Dust
    tokenId: 3, // ID del token para MOUNT-Y EvoZtone
    compatibleWith: ['shiny'],
    color: 'bg-blue-500'
  },
  MOUNT_X: {
    name: 'MOUNT-X EvoZtone',
    contractAddress: '0xE3a334D6b7681D0151b81964CAf6353905e24B1b', // Usar mismo contrato que Fire Dust
    tokenId: 2, // ID del token para MOUNT-X EvoZtone
    compatibleWith: ['shiny'],
    color: 'bg-green-500'
  }
};

// Interfaces
export interface EvolutionStone {
  type: keyof typeof EVOLUTION_STONES;
  tokenId: number;
  balance: number;
  metadata?: any;
  imageUrl?: string;
}

export interface PrimoNFT {
  tokenId: number;
  metadata: any;
  rarity: string;
  isShiny: boolean;
  isFullSet: boolean;
  bonusPoints: number;
}

export interface EvolutionProcess {
  id: string;
  wallet_address: string;
  primo_token_id: number;
  stone_type: string;
  stone_token_id: number;
  status: 'pending' | 'completed' | 'failed';
  transaction_hash?: string;
  metadata?: any;
  estimated_completion?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Obtiene el balance de piedras de evolución para un usuario
 * @param provider Proveedor Ethereum
 * @param walletAddress Dirección de la wallet del usuario
 * @returns Array de piedras de evolución con sus balances
 */
export async function fetchEvolutionStones(
  provider: Web3Provider,
  walletAddress: string
): Promise<EvolutionStone[]> {
  try {
    const stoneContract = new ethers.Contract(
      EVOLUTION_STONES.PRIMAL.contractAddress,
      FireDustABI,
      provider
    );
    
    const stonesToLoad = [
      { type: 'PRIMAL' as const, tokenId: EVOLUTION_STONES.PRIMAL.tokenId },
      { type: 'MOUNT_Y' as const, tokenId: EVOLUTION_STONES.MOUNT_Y.tokenId },
      { type: 'MOUNT_X' as const, tokenId: EVOLUTION_STONES.MOUNT_X.tokenId }
    ];
    
    const stonePromises = stonesToLoad.map(async (stone) => {
      const balance = await stoneContract.balanceOf(walletAddress, stone.tokenId);
      
      // Obtener la URI de los metadatos para este token
      let metadata = null;
      let imageUrl = '';
      
      try {
        const uri = await stoneContract.uri(stone.tokenId);
        
        // Si la URI es válida, intentar obtener los metadatos
        if (uri) {
          // Manejar diferentes formatos de URI (ipfs://, http://, etc.)
          let metadataUrl = uri;
          if (uri.startsWith('ipfs://')) {
            const ipfsHash = uri.replace('ipfs://', '');
            metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
          }
          
          const response = await fetch(metadataUrl);
          metadata = await response.json();
          
          // Extraer la URL de la imagen o animación
          if (metadata && metadata.image) {
            imageUrl = metadata.image;
            
            // Si la imagen es un IPFS URI, convertirla a URL HTTP
            if (imageUrl.startsWith('ipfs://')) {
              const ipfsHash = imageUrl.replace('ipfs://', '');
              imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
            }
          }
          
          console.log(`Metadatos obtenidos para piedra ${stone.type}:`, metadata);
        }
      } catch (error) {
        console.error(`Error obteniendo metadatos para piedra ${stone.type}:`, error);
      }
      
      return {
        ...stone,
        balance: balance.toNumber(),
        metadata,
        imageUrl
      };
    });
    
    return await Promise.all(stonePromises);
  } catch (err) {
    console.error('Error fetching evolution stones:', err);
    throw err;
  }
}

/**
 * Inicia el proceso de evolución de un Primo
 * @param provider Proveedor Ethereum
 * @param walletAddress Dirección de la wallet del usuario
 * @param primoTokenId ID del token Primo a evolucionar
 * @param stoneType Tipo de piedra a utilizar
 * @param primoMetadata Metadatos del Primo
 * @returns Información del proceso de evolución
 */
export async function startEvolutionProcess(
  provider: Web3Provider,
  walletAddress: string,
  primoTokenId: number,
  stoneType: keyof typeof EVOLUTION_STONES,
  primoMetadata: any
): Promise<EvolutionProcess> {
  try {
    // Obtener signer para transacciones
    const signer = provider.getSigner();
    
    // Verificar compatibilidad
    const stoneConfig = EVOLUTION_STONES[stoneType];
    
    // Intentar obtener la rareza de diferentes formas
    let primoRarity = '';
    
    // 1. Verificar si la rareza se pasó directamente
    if (typeof primoMetadata.rarity === 'string') {
      primoRarity = primoMetadata.rarity.toLowerCase();
      console.log('Rareza encontrada directamente:', primoRarity);
    } 
    // 2. Buscar en los atributos del metadata
    else if (primoMetadata.attributes && Array.isArray(primoMetadata.attributes)) {
      const rarityAttr = primoMetadata.attributes.find((attr: any) => attr.trait_type === 'Rarity');
      if (rarityAttr) {
        primoRarity = String(rarityAttr.value).toLowerCase();
        console.log('Rareza encontrada en atributos:', primoRarity);
      }
    }
    // 3. Buscar en originalMetadata si existe (algunos clientes pueden pasar la metadata anidada)
    else if (primoMetadata.originalMetadata?.attributes && Array.isArray(primoMetadata.originalMetadata.attributes)) {
      const rarityAttr = primoMetadata.originalMetadata.attributes.find((attr: any) => attr.trait_type === 'Rarity');
      if (rarityAttr) {
        primoRarity = String(rarityAttr.value).toLowerCase();
        console.log('Rareza encontrada en originalMetadata.attributes:', primoRarity);
      }
    }
    // 4. Verificar si hay un campo de isShiny que podríamos usar
    else if (typeof primoMetadata.isShiny === 'boolean') {
      primoRarity = primoMetadata.isShiny ? 'shiny' : 'original';
      console.log('Rareza inferida desde isShiny:', primoRarity);
    }
    
    // Detalle completo del metadata para debugging
    console.log('Metadata completo recibido:', JSON.stringify(primoMetadata, null, 2));
    
    // Si aún no se encuentra, manejar el error
    if (!primoRarity) {
      console.error('No se pudo determinar la rareza. Metadata recibido:', primoMetadata);
      throw new Error(`No se pudo determinar la rareza del Primo. Por favor, inténtalo de nuevo.`);
    }
    
    console.log(`Verificando compatibilidad: Piedra ${stoneType} (compatible con ${stoneConfig.compatibleWith.join(', ')}) y Primo de rareza ${primoRarity}`);
    
    if (!stoneConfig.compatibleWith.includes(primoRarity)) {
      throw new Error(`La piedra ${stoneConfig.name} no es compatible con Primos de rareza ${primoRarity}`);
    }
    
    // Crear instancia del contrato de piedras
    const stoneContract = new ethers.Contract(
      stoneConfig.contractAddress,
      FireDustABI,
      signer
    );
    
    // Verificar balance de la piedra
    const stoneBalance = await stoneContract.balanceOf(
      walletAddress, 
      stoneConfig.tokenId
    );
    
    if (stoneBalance.isZero()) {
      throw new Error(`No tienes ninguna piedra ${stoneConfig.name}`);
    }
    
    // Quemar la piedra de evolución (1 unidad)
    const burnTx = await stoneContract.safeTransferFrom(
      walletAddress,
      '0x000000000000000000000000000000000000dEaD', // Dirección de quemado
      stoneConfig.tokenId,
      1, // Cantidad a quemar
      '0x' // Datos adicionales (vacío)
    );
    
    // Esperar confirmación de la transacción
    await burnTx.wait();
    
    // Registrar la evolución en la base de datos
    const { data, error } = await supabase
      .from('evolutions')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        primo_token_id: primoTokenId,
        stone_type: stoneType,
        stone_token_id: stoneConfig.tokenId,
        status: 'pending',
        transaction_hash: burnTx.hash,
        metadata: {
          primo: {
            tokenId: primoTokenId,
            rarity: primoRarity,
            name: primoMetadata.name || `PRIMO #${primoTokenId}`,
            image: primoMetadata.image || null
          },
          stone: {
            name: stoneConfig.name,
            tokenId: stoneConfig.tokenId
          },
          originalMetadata: primoMetadata
        },
        estimated_completion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as EvolutionProcess;
  } catch (err) {
    console.error('Error starting evolution process:', err);
    throw err;
  }
}

/**
 * Obtiene el historial de evoluciones de un usuario
 * @param walletAddress Dirección de la wallet del usuario
 * @returns Lista de procesos de evolución
 */
export async function fetchUserEvolutions(walletAddress: string): Promise<EvolutionProcess[]> {
  try {
    const { data, error } = await supabase
      .from('evolutions')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return data as EvolutionProcess[];
  } catch (err) {
    console.error('Error fetching user evolutions:', err);
    throw err;
  }
}

/**
 * Verifica si un Primo y una piedra son compatibles
 * @param primoRarity Rareza del Primo
 * @param stoneType Tipo de piedra
 * @returns true si son compatibles, false en caso contrario
 */
export function areCompatible(primoRarity: string, stoneType: keyof typeof EVOLUTION_STONES): boolean {
  const stoneConfig = EVOLUTION_STONES[stoneType];
  return stoneConfig.compatibleWith.includes(primoRarity.toLowerCase());
}

/**
 * Obtiene los NFTs de un usuario específicamente para la evolución, sin calcular puntos
 * @param provider Proveedor Ethereum
 * @param walletAddress Dirección de la wallet del usuario
 * @returns Array de PrimoNFTs con la información necesaria para evolución
 */
export async function fetchUserNFTsForEvolution(
  provider: Web3Provider,
  walletAddress: string
): Promise<PrimoNFT[]> {
  try {
    const contract = new ethers.Contract(PRIMOS_NFT_CONTRACT, ERC721ABI, provider);
    
    // Get NFT balance
    const balance = await contract.balanceOf(walletAddress);
    const balanceNum = balance.toNumber();
    
    const nfts: PrimoNFT[] = [];
    
    // Iterate over all NFTs and get their IDs
    for (let i = 0; i < balanceNum; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
      const tokenIdNum = tokenId.toNumber();
      
      // Skip token 1903 which has known issues with fetching metadata
      if (tokenIdNum === 1903) {
        console.log(`⚠️ Skipping token 1903 due to known issues with metadata`);
        continue;
      }
      
      // Try to get the token URI
      const tokenURI = await contract.tokenURI(tokenId);
      
      // Get metadata
      let metadata: any = null;
      
      if (tokenURI) {
        try {
          // Use retry operation for fetching metadata with a limited number of retries
          const fetchMetadata = async () => {
            if (tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return await response.json();
            } else if (tokenURI.startsWith('http')) {
              const response = await fetch(tokenURI);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return await response.json();
            }
            return null;
          };
          
          // Try to fetch metadata with retries (3 attempts, starting with 1s delay)
          metadata = await retryOperation(
            fetchMetadata,
            3,  // Maximum 3 attempts
            1000, // Start with 1s delay
            2,    // Exponential backoff factor
            `Fetch metadata for token ${tokenIdNum}`
          );
        } catch (err) {
          console.error(`Failed to fetch metadata for token ${tokenIdNum} after multiple attempts:`, err);
          // Continue with the loop even if metadata fetch fails for this token
        }
      }
      
      // Determine rarity
      let rarity = '';
      let isShiny = false;
      let isFullSet = false;
      
      if (metadata?.attributes) {
        // Get rarity
        const rarityAttr = metadata.attributes.find((attr: any) => attr.trait_type === 'Rarity');
        if (rarityAttr) {
          rarity = rarityAttr.value as string;
          isShiny = rarity.toLowerCase().includes('shiny');
        }
        
        // Check if it has full set
        const fullSetAttr = metadata.attributes.find((attr: any) => attr.trait_type === 'Full Set');
        if (fullSetAttr && fullSetAttr.value === true) {
          isFullSet = true;
        }
      }
      
      nfts.push({
        tokenId: tokenIdNum,
        metadata,
        rarity,
        isShiny,
        isFullSet,
        bonusPoints: 0 // No calculamos puntos para la evolución
      });
    }
    
    return nfts;
  } catch (error) {
    console.error('Error fetching NFTs for evolution:', error);
    throw error;
  }
}
