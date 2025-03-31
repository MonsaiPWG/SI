'use client';

import { EVOLUTION_STONES, type EvolutionProcess, type PrimoNFT } from '@/services/evolutionService';

interface EvolutionHistoryProps {
  completedEvolutions: EvolutionProcess[];
  primoNFTs: PrimoNFT[];
}

const EvolutionHistory: React.FC<EvolutionHistoryProps> = ({ completedEvolutions, primoNFTs }) => {
  // Formatear fecha para mostrar
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
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
  
  return (
    <div className="w-full space-y-6 bg-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-white">Evolution History</h2>
      
      {completedEvolutions.length === 0 ? (
        <div className="p-4 text-center bg-gray-700 rounded-md">
          <p className="text-gray-300">No evolution history found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedEvolutions.map((evolution) => (
            <div key={evolution.id} className="bg-gray-700 rounded-lg overflow-hidden">
              {/* Mobile: stacked layout (vertical), Tablet/Desktop: horizontal layout */}
              <div className="flex flex-col sm:flex-row">
                {/* Imagen del Primo - ocupa toda la altura sin márgenes */}
                <div className="sm:w-1/4 h-full">
                  {primoNFTs.find(nft => nft.tokenId === evolution.primo_token_id)?.metadata?.image ? (
                    <div className="relative h-full">
                      <img 
                        src={primoNFTs.find(nft => nft.tokenId === evolution.primo_token_id)?.metadata?.image} 
                        alt={`Primo #${evolution.primo_token_id}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Si está evolucionado, mostrar indicador */}
                      {evolution.status === 'completed' && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white rounded-bl-md px-2 py-1">
                          <span className="text-xs font-bold">EVOLVED</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <span className="text-sm text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
                
                {/* Información del proceso de evolución - sin espacio extra */}
                <div className="flex-1 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">
                        PRIMO #{evolution.primo_token_id}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Started: {formatDate(evolution.created_at)}
                      </p>
                      {evolution.completed_at && (
                        <p className="text-xs text-gray-400">
                          Completed: {formatDate(evolution.completed_at)}
                        </p>
                      )}
                    </div>
                    <div>
                      {renderEvolutionStatus(evolution.status)}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-600 text-sm">
                    <div>
                      <p className="text-gray-400">Stone Type:</p>
                      <p className="text-white">{EVOLUTION_STONES[evolution.stone_type as keyof typeof EVOLUTION_STONES]?.name || evolution.stone_type}</p>
                    </div>
                  </div>
                  
                  {evolution.transaction_hash && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <p className="text-xs text-gray-400">
                        Transaction:{' '}
                        <a 
                          href={`https://app.roninchain.com/tx/${evolution.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline truncate"
                        >
                          {evolution.transaction_hash.substring(0, 10)}...{evolution.transaction_hash.substring(evolution.transaction_hash.length - 8)}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvolutionHistory;
