'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import { X, Home, Rocket, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppDrawer({ isOpen, onClose }: AppDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 ease-in-out", // Changed to bg-gray-900
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
            <X className="h-6 w-6" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
        <nav className="flex flex-col p-4 space-y-2">
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Rocket className="mr-2 h-5 w-5" />
            Planets
          </Button>
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </Button>
          <Button variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Info className="mr-2 h-5 w-5" />
            About
          </Button>
        </nav>
      </div>
    </>
  );
}
