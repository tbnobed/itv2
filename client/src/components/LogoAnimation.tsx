import React, { useEffect, useState } from 'react';
import { CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function LogoAnimation({ isVisible, onComplete }: LogoAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'pulse' | 'success' | 'exit'>('enter');
  
  useEffect(() => {
    if (!isVisible) return;

    const phases = [
      { phase: 'enter', duration: 500 },
      { phase: 'pulse', duration: 1000 },
      { phase: 'success', duration: 800 },
      { phase: 'exit', duration: 500 }
    ];

    let timeoutId: NodeJS.Timeout;
    let currentPhaseIndex = 0;

    const nextPhase = () => {
      if (currentPhaseIndex < phases.length) {
        const currentPhase = phases[currentPhaseIndex];
        setAnimationPhase(currentPhase.phase as any);
        
        timeoutId = setTimeout(() => {
          currentPhaseIndex++;
          if (currentPhaseIndex < phases.length) {
            nextPhase();
          } else {
            onComplete();
          }
        }, currentPhase.duration);
      }
    };

    nextPhase();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center",
        "transition-opacity duration-300",
        animationPhase === 'enter' && "opacity-0 animate-in fade-in",
        animationPhase === 'exit' && "animate-out fade-out"
      )}
      data-testid="logo-animation-overlay"
    >
      <div className="flex flex-col items-center space-y-8">
        
        {/* Animated Logo */}
        <div className="relative">
          <img 
            src="/assets/obtv-logo.png" 
            alt="OBTV" 
            className={cn(
              "h-32 w-auto transition-all duration-500 ease-out",
              animationPhase === 'enter' && "scale-75 opacity-0",
              animationPhase === 'pulse' && "scale-100 opacity-100",
              animationPhase === 'success' && "scale-110 opacity-100",
              animationPhase === 'exit' && "scale-125 opacity-0"
            )}
            data-testid="animated-logo"
          />
          
          {/* Pulsing Glow Effect */}
          {animationPhase === 'pulse' && (
            <div 
              className="absolute inset-0 rounded-lg bg-blue-500/20 animate-pulse"
              style={{
                filter: 'blur(20px)',
                animation: 'pulse 0.8s ease-in-out infinite alternate'
              }}
            />
          )}
          
          {/* Energy Rings */}
          {animationPhase === 'pulse' && (
            <>
              <div 
                className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping"
                style={{ 
                  animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                  transform: 'scale(1.2)'
                }}
              />
              <div 
                className="absolute inset-0 rounded-full border-2 border-blue-300/30 animate-ping"
                style={{ 
                  animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite 0.3s',
                  transform: 'scale(1.4)'
                }}
              />
            </>
          )}
          
          {/* Success Burst */}
          {animationPhase === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute">
                <Zap 
                  className={cn(
                    "w-8 h-8 text-yellow-400 animate-bounce",
                    "drop-shadow-lg"
                  )}
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {animationPhase === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-400 animate-bounce" />
            ) : (
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
            <span className={cn(
              "text-xl font-semibold transition-colors duration-300",
              animationPhase === 'success' ? "text-green-400" : "text-blue-400"
            )}>
              {animationPhase === 'enter' && "Authenticating..."}
              {animationPhase === 'pulse' && "Loading OBTV..."}
              {animationPhase === 'success' && "Welcome to OBTV!"}
              {animationPhase === 'exit' && "Welcome to OBTV!"}
            </span>
          </div>
          
          {animationPhase === 'pulse' && (
            <div className="flex justify-center space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="w-64 bg-gray-800 rounded-full h-2 overflow-hidden">
          <div 
            className={cn(
              "h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out",
              animationPhase === 'enter' && "w-0",
              animationPhase === 'pulse' && "w-2/3",
              animationPhase === 'success' && "w-full bg-gradient-to-r from-green-500 to-green-400",
              animationPhase === 'exit' && "w-full"
            )}
            style={{
              boxShadow: animationPhase === 'success' ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(59, 130, 246, 0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
}