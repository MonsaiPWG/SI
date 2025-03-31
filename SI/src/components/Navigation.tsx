'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <nav className="flex items-center">
      {/* Desktop menu - hidden on mobile */}
      <ul className="hidden md:flex space-x-6 mx-6">
        <li>
          <span 
            className="text-lg font-medium text-gray-500 cursor-default"
          >
            Mining
          </span>
        </li>
        <li>
          <Link 
            href="/evolution" 
            className={`text-lg font-medium ${pathname === '/evolution' ? 'text-white' : 'text-gray-400 hover:text-white transition-colors'}`}
          >
            Evolution
          </Link>
        </li>
      </ul>
      
      {/* Hamburger button - only visible on mobile */}
      <button 
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5 focus:outline-none"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-white transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
        <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>
      
      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 mx-auto max-w-sm px-4 md:hidden">
          <div className="bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3">
            <ul className="flex flex-col space-y-2">
              <li>
                <span 
                  className="block w-full text-lg font-medium py-2 px-3 rounded text-gray-500 cursor-default"
                >
                  Mining
                </span>
              </li>
              <li>
                <Link 
                  href="/evolution" 
                  className={`block w-full text-lg font-medium py-2 px-3 rounded ${pathname === '/evolution' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700 transition-colors'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Evolution
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
