import React from 'react';

export default function Page() {
  return (
    <div>
      <h1>Redirecting to main app...</h1>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.location.href = '/';
          `
        }}
      />
    </div>
  );
}
