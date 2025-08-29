import React, { useState } from 'react';

interface FloatingGuideButtonProps {
  title: string;
  content: React.ReactNode;
}

const FloatingGuideButton: React.FC<FloatingGuideButtonProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3), 0 4px 8px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.4), 0 6px 12px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.3), 0 4px 8px rgba(0, 0, 0, 0.1)';
        }}
        title="Panduan Bantuan"
        aria-label="Panduan Bantuan"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Guide Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 32px',
            maxWidth: 600,
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#9ca3af',
              }}
            >
              ×
            </button>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 16,
              color: '#111',
            }}>
              {title}
            </h2>
            <div style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: '#4b5563',
            }}>
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingGuideButton;