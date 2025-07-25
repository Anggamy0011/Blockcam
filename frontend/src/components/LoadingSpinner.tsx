import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'bars' | 'pulse';
  text?: string;
  progress?: number;
  showProgress?: boolean;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  type = 'spinner',
  text,
  progress,
  showProgress = false,
  color = '#1e3a8a'
}) => {
  const sizeMap = {
    small: { width: 20, height: 20, fontSize: 12 },
    medium: { width: 32, height: 32, fontSize: 14 },
    large: { width: 48, height: 48, fontSize: 16 }
  };

  const currentSize = sizeMap[size];

  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  animation: `bounce 1.4s ease-in-out infinite both`,
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>
        );

      case 'bars':
        return (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: '20px',
                  backgroundColor: color,
                  animation: `bars 1.2s ease-in-out infinite both`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div
            style={{
              width: currentSize.width,
              height: currentSize.height,
              borderRadius: '50%',
              backgroundColor: color,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        );

      default: // spinner
        return (
          <div
            style={{
              width: currentSize.width,
              height: currentSize.height,
              border: `3px solid #e5e7eb`,
              borderTop: `3px solid ${color}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {renderSpinner()}
      
      {text && (
        <div style={{
          fontSize: currentSize.fontSize,
          color: '#64748b',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {text}
        </div>
      )}
      
      {showProgress && progress !== undefined && (
        <div style={{ width: '100%', maxWidth: '200px' }}>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: color,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center',
            marginTop: '4px'
          }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
          
          @keyframes bars {
            0%, 40%, 100% {
              transform: scaleY(0.4);
            }
            20% {
              transform: scaleY(1);
            }
          }
          
          @keyframes pulse {
            0% {
              transform: scale(0.95);
              opacity: 0.5;
            }
            70% {
              transform: scale(1);
              opacity: 0.7;
            }
            100% {
              transform: scale(0.95);
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingSpinner; 