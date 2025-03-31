'use client';

const AboutEvolution: React.FC = () => {
  return (
    <div className="mt-8 bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">About Evolution</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
          <p className="text-sm text-gray-300">
            Evolution transforms your Primos into more powerful versions with new appearances. 
            Each evolution process takes up to 48 hours to complete once started.
          </p>
          <p className="text-sm text-gray-300 mt-2">
            During evolution, your Primo NFT remains in your wallet, but the Evolution Stone is consumed in the process.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Stone Compatibility</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-start">
              <div className="h-2 w-2 rounded-full bg-gray-100 mt-1 mr-2"></div>
              <span><strong>PRIMAL EvoZtone:</strong> Can only evolve Original Primos</span>
            </li>
            <li className="flex items-start">
              <div className="h-2 w-2 rounded-full bg-gray-100 mt-1 mr-2"></div>
              <span><strong>MOUNT-Y EvoZtone:</strong> Can only evolve Shiny Primos</span>
            </li>
            <li className="flex items-start">
              <div className="h-2 w-2 rounded-full bg-gray-100 mt-1 mr-2"></div>
              <span><strong>MOUNT-X EvoZtone:</strong> Can only evolve Shiny Primos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AboutEvolution;
