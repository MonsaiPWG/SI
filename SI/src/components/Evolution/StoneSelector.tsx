'use client';

import { useState } from 'react';
import { EVOLUTION_STONES, type EvolutionStone } from '@/services/evolutionService';

interface StoneSelectorProps {
  compatibleStones: EvolutionStone[];
  selectedStone: EvolutionStone | null;
  setSelectedStone: (stone: EvolutionStone | null) => void;
}

const StoneSelector: React.FC<StoneSelectorProps> = ({ 
  compatibleStones, 
  selectedStone, 
  setSelectedStone
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ITEMS_PER_VIEW = 4; // 2x2 grid

  // Navegación del carrusel
  const goToNext = () => {
    setCurrentIndex(prev => {
      const nextIndex = prev + ITEMS_PER_VIEW;
      return nextIndex >= compatibleStones.length ? 0 : nextIndex;
    });
  };

  const goToPrev = () => {
    setCurrentIndex(prev => {
      const prevIndex = prev - ITEMS_PER_VIEW;
      return prevIndex < 0 ? Math.max(0, compatibleStones.length - ITEMS_PER_VIEW) : prevIndex;
    });
  };

  // Calculamos las piedras visibles actualmente
  const visibleStones = compatibleStones.slice(currentIndex, currentIndex + ITEMS_PER_VIEW);
  
  // Rellenamos con elementos vacíos si no hay suficientes piedras para mostrar
  const fillerCount = ITEMS_PER_VIEW - visibleStones.length;
  const displayItems = [
    ...visibleStones,
    ...Array(fillerCount > 0 ? fillerCount : 0).fill(null)
  ];

  // Organizamos los items en 2 filas de 2 columnas
  const topRow = displayItems.slice(0, 2);
  const bottomRow = displayItems.slice(2, 4);

  // Función para renderizar un item de piedra
  const renderStoneItem = (stone: EvolutionStone) => {
    return (
      <div 
        key={stone.type} 
        className={`cursor-pointer transition-all border-2 rounded-lg overflow-hidden ${
          selectedStone && selectedStone.type === stone.type 
            ? 'border-yellow-500 shadow-lg scale-105 transform' 
            : 'border-transparent'
        }`}
        onClick={() => setSelectedStone(stone)}
      >
        <div className={`aspect-square w-full flex items-center justify-center ${stone.imageUrl ? 'bg-[#272b34]' : EVOLUTION_STONES[stone.type as keyof typeof EVOLUTION_STONES].color}`}>
          {stone.imageUrl ? (
            // Si hay una URL de imagen, mostrar la imagen con fondo oscuro
            <div className="w-full h-full relative flex items-center justify-center">
              <img 
                src={stone.imageUrl} 
                alt={EVOLUTION_STONES[stone.type as keyof typeof EVOLUTION_STONES].name}
                className="w-full h-full object-contain"
                style={{ imageRendering: "auto", maxHeight: "100%" }}
              />
            </div>
          ) : (
            // Si no hay URL de imagen, mostrar el SVG de respaldo
            <div className="text-center p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-2 bg-gray-700">
          <p className="text-sm font-semibold text-white truncate">
            {EVOLUTION_STONES[stone.type as keyof typeof EVOLUTION_STONES].name}
          </p>
          <p className="text-xs text-gray-300">Balance: {stone.balance}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Select EvoZtone</h2>
      
      {compatibleStones.length === 0 ? (
        <div className="p-4 text-center bg-gray-700 rounded-md flex flex-col items-center">
          <div className="w-full max-w-sm mx-auto my-4">
            <img 
              src="/images/stone_socket.png" 
              alt="Empty Stone Socket" 
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="text-gray-300 mb-4">No EvoZstones available</p>
          <a 
            href="https://marketplace.roninchain.com/collections/primateria?auction=Sale" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-md transition-colors"
          >
            Buy EvoZstones on Marketplace
          </a>
        </div>
      ) : (
        <div className="relative">
          {/* Controles de navegación - solo mostrar si hay más de ITEMS_PER_VIEW */}
          {compatibleStones.length > ITEMS_PER_VIEW && (
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
          
          <div className={`${compatibleStones.length > ITEMS_PER_VIEW ? 'px-10' : ''}`}>
            {/* Layout condicional basado en la cantidad de piedras */}
            {compatibleStones.length === 1 ? (
              // Para 1 piedra: Ancho completo sin margenes
              <div className="w-full py-8">
                {renderStoneItem(compatibleStones[0])}
              </div>
            ) : compatibleStones.length === 2 ? (
              // Para 2 piedras: Grid de ancho completo sin margenes
              <div className="w-full grid grid-cols-2 gap-4">
                {renderStoneItem(compatibleStones[0])}
                {renderStoneItem(compatibleStones[1])}
              </div>
            ) : (
              // Para 3 o más piedras: Grid 2x2
              <div className="space-y-4">
                {/* Primera fila: 2 piedras */}
                <div className="grid grid-cols-2 gap-4">
                  {topRow.map((stone, index) => {
                    if (!stone) return (
                      <div key={`empty-top-${index}`} className="aspect-square rounded-lg" />
                    );
                    
                    return renderStoneItem(stone);
                  })}
                </div>
                
                {/* Segunda fila: 2 piedras */}
                <div className="grid grid-cols-2 gap-4">
                  {bottomRow.map((stone, index) => {
                    if (!stone) return (
                      <div key={`empty-bottom-${index}`} className="aspect-square rounded-lg" />
                    );
                    
                    return renderStoneItem(stone);
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Indicadores de página - solo mostrar si hay más de ITEMS_PER_VIEW */}
          {compatibleStones.length > ITEMS_PER_VIEW && (
            <div className="flex justify-center mt-4 space-x-1">
              {Array.from({ length: Math.ceil(compatibleStones.length / ITEMS_PER_VIEW) }).map((_, index) => (
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

export default StoneSelector;
