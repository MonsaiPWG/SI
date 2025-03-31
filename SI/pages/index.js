// This is a placeholder file to ensure the pages directory is recognized by Next.js
// The actual application logic is in the app directory

import React from 'react';

export default function Home() {
  return (
    <div>
      <h1>Loading application...</h1>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Redirect to the app router path
            window.location.href = '/';
          `
        }}
      />
    </div>
  );
}
