'use client';

import { useState, useEffect } from 'react';
import { type PrimoNFT } from '@/services/evolutionService';

interface PrimoCarouselProps {
  primoNFTs: PrimoNFT[];
  selectedPrimo: PrimoNFT | null;
  setSelectedPrimo: (primo: PrimoNFT | null) => void;
  getRarityStyle: (rarity: string) => string;
  isPrimoEvolving: (tokenId: number) => { isEvolving: boolean; status: string };
}

const PrimoCarousel: React.FC<PrimoCarouselProps> = ({ 
  primoNFTs, 
  selectedPrimo, 
  setSelectedPrimo, 
  getRarityStyle,
  isPrimoEvolving
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ITEMS_PER_VIEW = 4;

  // Navegación del carrusel
  const goToNext = () => {
    setCurrentIndex(prev => {
      const nextIndex = prev + ITEMS_PER_VIEW;
      return nextIndex >= primoNFTs.length ? 0 : nextIndex;
    });
  };

  const goToPrev = () => {
    setCurrentIndex(prev => {
      const prevIndex = prev - ITEMS_PER_VIEW;
      return prevIndex < 0 ? Math.max(0, primoNFTs.length - ITEMS_PER_VIEW) : prevIndex;
    });
  };

  // Calculamos los primos visibles actualmente
  const visiblePrimos = primoNFTs.slice(currentIndex, currentIndex + ITEMS_PER_VIEW);
  
  // Rellenamos con elementos vacíos si no hay suficientes primos para mostrar
  const fillerCount = ITEMS_PER_VIEW - visiblePrimos.length;
  const displayItems = [
    ...visiblePrimos,
    ...Array(fillerCount > 0 ? fillerCount : 0).fill(null)
  ];

  // Organizamos los items en 2 filas de 2 columnas
  const topRow = displayItems.slice(0, 2);
  const bottomRow = displayItems.slice(2, 4);

  // Función para renderizar un item de Primo
  const renderPrimoItem = (nft: PrimoNFT) => {
    const { isEvolving, status } = isPrimoEvolving(nft.tokenId);
    
    return (
      <div 
        key={nft.tokenId} 
        className={`relative ${isEvolving ? 'cursor-not-allowed' : 'cursor-pointer'} transition-all border-2 rounded-lg overflow-hidden ${
          selectedPrimo && selectedPrimo.tokenId === nft.tokenId 
            ? 'border-yellow-500 shadow-xl scale-105 transform' 
            : 'border-transparent'
        }`}
        onClick={() => {
          if (!isEvolving) {
            setSelectedPrimo(nft);
          }
        }}
      >
        <div className="aspect-square w-full relative overflow-hidden">
          {nft.metadata?.image ? (
            <>
              <img 
                src={nft.metadata.image} 
                alt={nft.metadata.name || `Primo #${nft.tokenId}`} 
                className={`w-full h-full object-cover ${isEvolving ? 'opacity-50' : ''}`}
              />
              {isEvolving && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                  <span className={`px-2 py-1 ${status === 'Evolved' ? 'bg-green-500' : 'bg-yellow-500'} text-gray-900 text-sm font-bold rounded-md uppercase`}>
                    {status}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <span className="text-gray-300">No Image</span>
            </div>
          )}
        </div>
        <div className="p-2 bg-gray-700">
          <p className="text-sm font-semibold text-white truncate">
            {nft.metadata?.name || `Primo #${nft.tokenId}`}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {nft.rarity && (
              <span className={`inline-block px-1 py-0.5 text-white text-xs font-bold rounded uppercase ${getRarityStyle(nft.rarity)}`}>
                {nft.rarity}
              </span>
            )}
            {nft.isFullSet && (
              <span className="inline-block px-1 py-0.5 bg-[#36B57C] text-white text-xs font-bold rounded uppercase">
                Full Set
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Select a Primo to evolve</h2>
      
      {primoNFTs.length === 0 ? (
        <div className="relative w-full rounded-lg overflow-hidden">
          <div className="w-full relative">
            <img 
              src="/images/primo_estatua.jpg" 
              alt="Primo statue" 
              className="w-full h-auto rounded-lg filter grayscale"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <h3 className="text-white text-xl font-bold px-6 py-4 bg-black bg-opacity-70 rounded-lg">
                No Primos found in your wallet
              </h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Controles de navegación - solo mostrar si hay más de ITEMS_PER_VIEW */}
          {primoNFTs.length > ITEMS_PER_VIEW && (
            <>
              <button 
                onClick={goToPrev}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2"
                aria-label="Previous"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button 
                onClick={goToNext}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2"
                aria-label="Next"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <div className={`${primoNFTs.length > ITEMS_PER_VIEW ? 'px-10' : ''}`}>
            {/* Layout condicional basado en la cantidad de Primos */}
            {primoNFTs.length === 1 ? (
              // Para 1 Primo: Ancho completo sin margenes
              <div className="w-full py-8">
                {renderPrimoItem(primoNFTs[0])}
              </div>
            ) : primoNFTs.length === 2 ? (
              // Para 2 Primos: Grid de ancho completo sin margenes
              <div className="w-full grid grid-cols-2 gap-4">
                {renderPrimoItem(primoNFTs[0])}
                {renderPrimoItem(primoNFTs[1])}
              </div>
            ) : (
              // Para 3 o más Primos: Grid 2x2
              <div className="space-y-4">
                {/* Primera fila: 2 primos */}
                <div className="grid grid-cols-2 gap-4">
                  {topRow.map((nft, index) => {
                    if (!nft) return (
                      <div key={`empty-top-${index}`} className="aspect-square rounded-lg" />
                    );
                    
                    return renderPrimoItem(nft);
                  })}
                </div>
                
                {/* Segunda fila: 2 primos */}
                <div className="grid grid-cols-2 gap-4">
                  {bottomRow.map((nft, index) => {
                    if (!nft) return (
                      <div key={`empty-bottom-${index}`} className="aspect-square rounded-lg" />
                    );
                    
                    return renderPrimoItem(nft);
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Indicadores de página - solo mostrar si hay más de ITEMS_PER_VIEW */}
          {primoNFTs.length > ITEMS_PER_VIEW && (
            <div className="flex justify-center mt-4 space-x-1">
              {Array.from({ length: Math.ceil(primoNFTs.length / ITEMS_PER_VIEW) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * ITEMS_PER_VIEW)}
                  className={`h-2 rounded-full focus:outline-none transition-all duration-300 ${
                    currentIndex === index * ITEMS_PER_VIEW 
                      ? 'w-4 bg-yellow-500' 
                      : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrimoCarousel;
