'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import RoninWallet from '@/components/wallet-connectors/ronin-wallet/RoninWallet';
import Navigation from '@/components/Navigation';
import EvolutionInterface from '@/components/Evolution/EvolutionInterface';
import AboutEvolution from '@/components/Evolution/AboutEvolution';
import { useConnectorStore } from '@/hooks/useConnectorStore';
import { RONIN_CHAIN_IDS } from '@/utils/contract';

export default function EvolutionPage() {
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [networkName, setNetworkName] = useState<string>('Not Connected');
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const { account, connector, isConnected } = useConnectorStore();

  // Función para obtener el nombre de la red
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case RONIN_CHAIN_IDS.MAINNET:
        return 'Ronin Mainnet';
      case RONIN_CHAIN_IDS.TESTNET:
        return 'Ronin Saigon Testnet';
      default:
        return `Unknown Network (${chainId})`;
    }
  };

  // Effect para verificar si ya hay una conexión activa en el store
  useEffect(() => {
    // Si hay una conexión activa y una cuenta en el store, pero no tenemos provider local
    if (isConnected && account && !provider && connector) {
      const initializeProvider = async () => {
        try {
          console.log('Evolution Page: Restaurando provider desde el store');
          const providerInstance = await connector.getProvider();
          
          if (providerInstance) {
            const ethersProvider = new Web3Provider(providerInstance as any);
            
            // Configurar el estado local con el provider restaurado
            setProvider(ethersProvider);
            
            // Obtener info de la red
            const network = await ethersProvider.getNetwork();
            setNetworkName(getNetworkName(network.chainId));
            
            // Establecer la dirección de usuario desde el account del store
            setUserAddress(account);
          }
        } catch (err) {
          console.error('Error al restaurar provider en Evolution Page:', err);
        }
      };
      
      initializeProvider();
    }
  }, [isConnected, account, provider, connector]);

  // Función para conectar wallet
  const handleConnect = async (newProvider: Web3Provider) => {
    setProvider(newProvider);
    
    // Obtener info de la red
    try {
      const network = await newProvider.getNetwork();
      setNetworkName(getNetworkName(network.chainId));
      
      // Obtener dirección del usuario
      const accounts = await newProvider.listAccounts();
      if (accounts.length > 0) {
        setUserAddress(accounts[0]);
      }
    } catch (err) {
      console.error("Error getting network info:", err);
      setNetworkName('Unknown Network');
    }
  };

  // Función para desconectar wallet
  const handleDisconnect = () => {
    setProvider(null);
    setNetworkName('Not Connected');
    setUserAddress(null);
  };

  return (
    <div className="min-h-screen relative" style={{
      backgroundImage: "url('/images/altar_big.jpeg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      {/* Capa de blur por encima del fondo */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          zIndex: 0
        }}
      />
      
      {/* Contenido principal (encima de la capa de blur) */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <header className="bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            {/* Top section with title and hamburger menu */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <img 
                  src="/images/primos_logo.png" 
                  alt="Primos Logo" 
                  style={{ width: '40px', height: 'auto' }}
                  className="mr-3"
                />
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase">
                    Primos Evolution 
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Evolve your Primos with special EvoZtones
                  </p>
                </div>
              </div>
              
              {/* Navigation visible on desktop, hamburger on mobile */}
              <div className="flex items-center">
                <div className="hidden md:block mr-4">
                  <Navigation />
                </div>
                <div className="md:hidden">
                  <Navigation />
                </div>
                <div className="hidden md:block">
                  <RoninWallet onConnect={handleConnect} onDisconnect={handleDisconnect} />
                </div>
              </div>
            </div>
            
            {/* Bottom section for wallet buttons on mobile */}
            <div className="md:hidden mt-4 w-full">
              <RoninWallet onConnect={handleConnect} onDisconnect={handleDisconnect} />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {provider ? (
              <EvolutionInterface 
                provider={provider} 
                userAddress={userAddress}
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-8">
                {/* Logo de Primos */}
                <div className="w-64 mx-auto">
                  <img 
                    src="/images/logo_primos_inicio.png" 
                    alt="Primos Logo" 
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Mensaje de bienvenida */}
                <h2 className="text-2xl font-bold text-white text-center">
                  Connect your Ronin Wallet to evolve your Primos
                </h2>
                
                {/* Video con preview */}
                <div className="w-full max-w-3xl mx-auto">
                  <video 
                    src="/videos/piedras_o.webm" 
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full rounded-lg"
                    poster="/images/frame_primo.png"
                  />
                </div>
                
                {/* About Evolution component */}
                <div className="w-full max-w-3xl mx-auto">
                  <AboutEvolution />
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-gray-800 shadow mt-12">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center">
              <img 
                src="/images/logo_pimos_footer.png" 
                alt="Primos Logo" 
                style={{ width: '80px', height: 'auto' }}
                className="mb-2"
              />
              <p className="text-center text-sm text-gray-400">
                PRIMOS Evolution - {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
