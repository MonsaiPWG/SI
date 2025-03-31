'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import {
  fetchEvolutionStones,
  startEvolutionProcess,
  fetchUserEvolutions,
  fetchUserNFTsForEvolution,
  EVOLUTION_STONES,
  type EvolutionStone,
  type PrimoNFT,
  type EvolutionProcess
} from '@/services/evolutionService';
import EvolutionHistory from './EvolutionHistory';
import AboutEvolution from './AboutEvolution';
import PrimoCarousel from './PrimoCarousel';
import StoneSelector from './StoneSelector';

interface EvolutionInterfaceProps {
  provider: Web3Provider | null;
  userAddress: string | null;
}

const EvolutionInterface: React.FC<EvolutionInterfaceProps> = ({ provider, userAddress }) => {
  // Estados para NFTs y piedras de evolución
  const [primoNFTs, setPrimoNFTs] = useState<PrimoNFT[]>([]);
  const [evolutionStones, setEvolutionStones] = useState<EvolutionStone[]>([]);
  const [selectedPrimo, setSelectedPrimo] = useState<PrimoNFT | null>(null);
  const [selectedStone, setSelectedStone] = useState<EvolutionStone | null>(null);
  
  // Estados para el proceso de evolución
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEvolutionInProgress, setIsEvolutionInProgress] = useState<boolean>(false);
  const [completedEvolutions, setCompletedEvolutions] = useState<EvolutionProcess[]>([]);
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});

  // Obtener la rareza del Primo (desde la propiedad o desde los atributos)
  const getPrimoRarity = useCallback((primo: PrimoNFT): string => {
    // Si la rareza está definida directamente, usarla
    if (primo.rarity) {
      return primo.rarity.toLowerCase();
    }
    
    // Si no, intentar extraerla de los atributos
    if (primo.metadata?.attributes) {
      const rarityAttr = primo.metadata.attributes.find(
        (attr: any) => attr.trait_type === 'Rarity'
      );
      
      if (rarityAttr) {
        return rarityAttr.value.toLowerCase();
      }
    }
    
    // Si llegamos aquí, no pudimos determinar la rareza
    return '';
  }, []);
  
  // Cargar NFTs y piedras al iniciar
  useEffect(() => {
    if (!provider || !userAddress) return;
    
    const loadUserAssets = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Cargar NFTs del usuario usando nuestro servicio específico para Evolution
        try {
          const nfts = await fetchUserNFTsForEvolution(provider, userAddress);
          setPrimoNFTs(nfts);
        } catch (err) {
          console.error('Error fetching NFTs for evolution:', err);
          setError('Error loading your Primos. Please try again.');
        }
        
        // Cargar piedras de evolución del usuario
        const stones = await fetchEvolutionStones(provider, userAddress);
        setEvolutionStones(stones);
        
        // Cargar evoluciones previas del usuario
        const evolutions = await fetchUserEvolutions(userAddress);
        setCompletedEvolutions(evolutions);
      } catch (err) {
        console.error('Error loading user assets:', err);
        setError('Error loading your assets. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAssets();
  }, [provider, userAddress]);
  
  // Verificar compatibilidad entre Primo y piedra
  const isPrimoAndStoneCompatible = useCallback((): boolean => {
    if (!selectedPrimo || !selectedStone) return false;
    
    const stoneConfig = EVOLUTION_STONES[selectedStone.type];
    const primoRarity = getPrimoRarity(selectedPrimo);
    
    // Si no pudimos determinar la rareza, no es compatible
    if (!primoRarity) {
      return false;
    }
    
    return stoneConfig.compatibleWith.includes(primoRarity);
  }, [selectedPrimo, selectedStone, getPrimoRarity]);
  
  // Obtener piedras compatibles para el Primo seleccionado usando useMemo para evitar recálculos innecesarios
  const compatibleStones = useMemo((): EvolutionStone[] => {
    if (!selectedPrimo) return [];
    
    // Obtener la rareza usando la función auxiliar
    const primoRarity = getPrimoRarity(selectedPrimo);
    
    // Si no pudimos determinar la rareza, mostrar error y retornar array vacío
    if (!primoRarity) {
      return [];
    }
    
    return evolutionStones.filter(stone => {
      const stoneConfig = EVOLUTION_STONES[stone.type];
      const isCompatible = stoneConfig.compatibleWith.includes(primoRarity);
      const hasBalance = stone.balance > 0;
      
      return isCompatible && hasBalance;
    });
  }, [selectedPrimo, evolutionStones, getPrimoRarity]); // Solo recalcular cuando cambie el Primo seleccionado o las piedras
  
  // Iniciar proceso de evolución
  const startEvolution = useCallback(async () => {
    if (!provider || !userAddress || !selectedPrimo || !selectedStone) {
      setError('Please select both a Primo and a compatible Evolution Stone.');
      return;
    }
    
    // Verificar compatibilidad
    if (!isPrimoAndStoneCompatible()) {
      setError('The selected stone is not compatible with this Primo.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Preparar los metadatos con la información de rareza
      // Primero obtenemos la rareza de los atributos si está disponible
      let rarityFromAttributes = '';
      
      if (selectedPrimo.metadata?.attributes) {
        const rarityAttr = selectedPrimo.metadata.attributes.find(
          (attr: any) => attr.trait_type === 'Rarity'
        );
        if (rarityAttr) {
          rarityFromAttributes = rarityAttr.value;
        }
      }
      
      // Usar la rareza de los atributos si la propiedad rarity no está definida
      const effectiveRarity = selectedPrimo.rarity || rarityFromAttributes;
      
      // Iniciar proceso de evolución con metadatos enriquecidos
      await startEvolutionProcess(
        provider,
        userAddress,
        selectedPrimo.tokenId,
        selectedStone.type,
        {
          ...selectedPrimo.metadata,
          rarity: effectiveRarity // Incluir explícitamente la rareza efectiva
        }
      );
      
      // Actualizar estado y mostrar animación
      setIsEvolutionInProgress(true);
      setSuccess('Evolution process started! Your Primo will evolve in up to 48 hours.');
      
      // Actualizar las piedras del usuario después de usar una
      const updatedStones = await fetchEvolutionStones(provider, userAddress);
      setEvolutionStones(updatedStones);
      
      // Actualizar el historial de evoluciones
      const evolutions = await fetchUserEvolutions(userAddress);
      setCompletedEvolutions(evolutions);
      
      // Limpiar selecciones
      setTimeout(() => {
        setSelectedPrimo(null);
        setSelectedStone(null);
        setIsEvolutionInProgress(false);
      }, 5000); // Después de 5 segundos
    } catch (err: any) {
      console.error('Error starting evolution:', err);
      setError(err.message || 'Error starting evolution process. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [provider, userAddress, selectedPrimo, selectedStone, isPrimoAndStoneCompatible]);
  
  // Función para calcular el tiempo restante para la evolución
  const calculateTimeRemaining = useCallback((estimatedCompletionDate: string | undefined): string => {
    if (!estimatedCompletionDate) return 'Unknown';
    
    const now = new Date();
    const completionDate = new Date(estimatedCompletionDate);
    
    // Si ya pasó la fecha de finalización
    if (completionDate <= now) {
      return 'Completing soon...';
    }
    
    // Calcular diferencia en milisegundos
    const diffMs = completionDate.getTime() - now.getTime();
    
    // Convertir a horas, minutos y segundos
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);
  
  // Efecto para actualizar los countdowns cada segundo
  useEffect(() => {
    // Skip if no pending evolutions
    const pendingEvolutions = completedEvolutions.filter(evo => evo.status === 'pending');
    if (pendingEvolutions.length === 0) return;
    
    // Initialize countdowns
    const updateCountdowns = () => {
      const newCountdowns: { [key: string]: string } = {};
      
      pendingEvolutions.forEach(evolution => {
        if (evolution.estimated_completion) {
          newCountdowns[evolution.id] = calculateTimeRemaining(evolution.estimated_completion);
        }
      });
      
      setCountdowns(newCountdowns);
    };
    
    // Update immediately
    updateCountdowns();
    
    // Update every second
    const intervalId = setInterval(updateCountdowns, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [completedEvolutions, calculateTimeRemaining]);
  
  // Renderizar estado de la evolución
  const renderEvolutionStatus = (status: string): JSX.Element => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Evolving</span>;
      case 'completed':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Completed</span>;
      case 'failed':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Failed</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">{status}</span>;
    }
  };
  
  // Función para determinar el estilo de cada tipo de rareza
  const getRarityStyle = (rarity: string) => {
    switch(rarity.toLowerCase()) {
      case 'original':
        return 'bg-[#C50045]';
      case 'original z':
        return 'bg-[#EA0354]';
      case 'shiny':
        return 'bg-gradient-to-r from-[#00E9FF] via-[#AD4DFF] to-[#FF7CFF]';
      case 'shiny z':
        return 'bg-gradient-to-r from-[#00E9FF] via-[#AD4DFF] via-[#FF7CFF] to-[#FF6265]';
      case 'unique':
        return 'bg-gradient-to-r from-[#FFC800] to-[#FF4B4B]';
      default:
        return 'bg-gray-500';
    }
  };

  // Check if a Primo has a pending evolution
  const isPrimoEvolving = (tokenId: number): { isEvolving: boolean; status: string } => {
    const evolution = completedEvolutions.find(evo => evo.primo_token_id === tokenId);
    
    if (!evolution) {
      return { isEvolving: false, status: '' };
    }
    
    if (evolution.status === 'pending') {
      return { isEvolving: true, status: 'Evolving' };
    } else if (evolution.status === 'completed') {
      return { isEvolving: true, status: 'Evolved' };
    }
    
    return { isEvolving: false, status: '' };
  };

  return (
    <div className="space-y-8">
      {/* Mensajes de error y éxito */}
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 rounded-md bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      
      {/* Animación de evolución en progreso */}
      {isEvolutionInProgress && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
          <div className="text-center p-8 rounded-lg bg-black bg-opacity-80 max-w-md">
            <div className="mb-4">
              <div className="w-32 h-32 mx-auto relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400 opacity-75"></div>
                <div className="relative flex items-center justify-center w-full h-full rounded-full bg-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Evolution Started!</h3>
            <p className="text-gray-300 mb-4">
              Your Primo is beginning its transformation. The evolution will complete in approximately up to 48 hours.
            </p>
            <div className="flex justify-center">
              <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-yellow-500 animate-loadingBar"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Sección de selección - ahora a ancho completo con dos columnas */}
          <div className="w-full bg-gray-800 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Componente de carrusel para selección de Primos */}
              <PrimoCarousel 
                primoNFTs={primoNFTs}
                selectedPrimo={selectedPrimo}
                setSelectedPrimo={(primo) => {
                  setSelectedPrimo(primo);
                  setSelectedStone(null); // Reset stone selection
                  setError(null);
                }}
                getRarityStyle={getRarityStyle}
                isPrimoEvolving={isPrimoEvolving}
              />
              
              {/* Segunda columna - Carrusel de piedras */}
              {!selectedPrimo ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Select Evolution Stone</h2>
                  <div className="p-4 text-center bg-gray-700 rounded-md flex flex-col items-center">
                    <div className="w-full max-w-sm mx-auto my-4">
                      <img 
                        src="/images/stone_socket.png" 
                        alt="Empty Stone Socket" 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <p className="text-gray-300">Select a Primo first</p>
                  </div>
                </div>
              ) : (
                <StoneSelector
                  compatibleStones={compatibleStones}
                  selectedStone={selectedStone}
                  setSelectedStone={(stone) => {
                    setSelectedStone(stone);
                    setError(null);
                  }}
                />
              )}
            </div>
            
            {/* Botón de evolución - abajo a lo ancho completo */}
            <div className="mt-8">
              <button
                className={`w-full py-3 px-4 rounded-md font-semibold ${
                  selectedPrimo && selectedStone && isPrimoAndStoneCompatible()
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                } transition-colors`}
                disabled={!selectedPrimo || !selectedStone || !isPrimoAndStoneCompatible() || loading}
                onClick={startEvolution}
              >
                {loading ? 'Processing...' : 'Evolve'}
              </button>
            </div>
          </div>
          
          {/* Componente de historial de evolución */}
          <EvolutionHistory 
            completedEvolutions={completedEvolutions} 
            primoNFTs={primoNFTs}
          />
        </>
      )}
      
      {/* Componente de información sobre evolución */}
      <AboutEvolution />
    </div>
  );
};

export default EvolutionInterface;
