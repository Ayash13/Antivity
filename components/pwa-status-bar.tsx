"use client"

export function PWAStatusBar() {
  return (
    <>
      <div className="pwa-status-bar">
        <div className="flex items-center justify-center h-full">{/* Empty div to maintain structure */}</div>
      </div>
      <style jsx>{`
        .pwa-status-bar {
          display: none;
          background: linear-gradient(135deg, #6CD3FF 0%, #50B0FF 100%);
          height: env(safe-area-inset-top, 0px);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
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
        
        /* iOS-specific PWA detection */
        @supports (-webkit-touch-callout: none) {
          @media (display-mode: standalone) {
            .pwa-status-bar {
              display: block;
              background: #6CD3FF;
            }
          }
          
          /* Additional iOS PWA detection */
          @media (max-device-width: 428px) and (orientation: portrait) {
            .pwa-status-bar {
              display: block;
            }
          }
        }
      `}</style>
    </>
  )
}
