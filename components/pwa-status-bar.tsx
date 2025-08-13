"use client"

export function PWAStatusBar() {
  return (
    <div className="pwa-status-bar">
      <div className="flex items-center justify-center h-full">
        <span className="text-white font-medium text-sm">Antivity</span>
      </div>
      <style jsx>{`
        .pwa-status-bar {
          display: none;
          background-color: #6CD3FF;
          height: env(safe-area-inset-top, 0px);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
        }
        
        @media (display-mode: standalone) {
          .pwa-status-bar {
            display: block;
          }
        }
        
        @media (display-mode: fullscreen) {
          .pwa-status-bar {
            display: block;
          }
        }
        
        @supports (-webkit-touch-callout: none) {
          @media (display-mode: standalone) {
            .pwa-status-bar {
              display: block;
            }
          }
        }
      `}</style>
    </div>
  )
}
