import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Shield, Monitor, CheckCircle, Lock, Download, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { passcodeLoginSchema } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import LogoAnimation from '@/components/LogoAnimation';

interface LockoutState {
  isLocked: boolean;
  retryAfter: number;
  countdown: number;
}

export default function PasscodeAuthPage() {
  const [, navigate] = useLocation();
  const { user, passcodeLoginMutation } = useAuth();
  const { toast } = useToast();
  
  const [passcode, setPasscode] = useState('');
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const [lockoutState, setLockoutState] = useState<LockoutState>({
    isLocked: false,
    retryAfter: 0,
    countdown: 0
  });

  // Redirect if already logged in - but don't interrupt the animation
  useEffect(() => {
    if (user && !showLogoAnimation && !passcodeLoginMutation.isSuccess) {
      navigate('/');
    }
  }, [user, navigate, showLogoAnimation, passcodeLoginMutation.isSuccess]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutState.isLocked && lockoutState.countdown > 0) {
      const timer = setTimeout(() => {
        setLockoutState(prev => ({
          ...prev,
          countdown: prev.countdown - 1
        }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockoutState.countdown === 0) {
      setLockoutState(prev => ({ ...prev, isLocked: false }));
    }
  }, [lockoutState.countdown, lockoutState.isLocked]);

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumberClick = (digit: string) => {
    if (passcode.length < 4 && !lockoutState.isLocked) {
      setPasscode(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPasscode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPasscode('');
  };

  const handleSubmit = async () => {
    if (passcode.length !== 4 || lockoutState.isLocked) return;

    try {
      // Validate format locally first
      passcodeLoginSchema.parse({ code: passcode });
      
      // Attempt login
      await passcodeLoginMutation.mutateAsync({ code: passcode });
      
      // Show logo animation before navigating
      setShowLogoAnimation(true);
    } catch (error: any) {
      // Handle rate limiting
      if (error.status === 429 && error.retryAfter) {
        setLockoutState({
          isLocked: true,
          retryAfter: error.retryAfter,
          countdown: error.retryAfter
        });
        toast({
          title: "Too Many Attempts",
          description: `Try again in ${formatCountdown(error.retryAfter)}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid Passcode",
          description: "Please try again",
          variant: "destructive",
        });
      }
      setPasscode('');
    }
  };

  const handleAnimationComplete = () => {
    navigate('/');
  };

  // Handle keyboard input for TV remotes
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (lockoutState.isLocked) return;

      const key = event.key;
      
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        handleNumberClick(key);
      } else if (key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
      } else if (key === 'Enter' && passcode.length === 4) {
        event.preventDefault();
        handleSubmit();
      } else if (key === 'Escape' || key === 'Delete') {
        event.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [passcode, lockoutState.isLocked]);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (passcode.length === 4 && !lockoutState.isLocked) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [passcode, lockoutState.isLocked]);


  // Apply TV-specific scaling for auth page
  React.useEffect(() => {
    const userAgent = navigator.userAgent;
    const isSilkBrowser = /Silk|AFT/i.test(userAgent);
    const isLargeScreen = screen.width >= 1280 && screen.height >= 720;
    
    if (isSilkBrowser || isLargeScreen) {
      const authContainer = document.querySelector('.auth-container');
      if (authContainer) {
        // Apply moderate scaling for TV browsers
        (authContainer as HTMLElement).style.transform = 'scale(0.8)';
        (authContainer as HTMLElement).style.transformOrigin = 'top center';
        (authContainer as HTMLElement).style.width = '125%'; // Compensate for scale
        console.log('Applied TV scaling to auth page');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-auto">
      <div className="container mx-auto flex items-start justify-center min-h-screen p-2 py-4">
        <div className="auth-container w-full max-w-md space-y-4">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src="/assets/obtv-logo.png" 
                alt="OBTV" 
                className="h-24 w-auto"
                data-testid="obtv-logo"
              />
            </div>
            <div className="space-y-1">
              <p className="text-lg text-muted-foreground">
                Enter 4-digit passcode to access streams
              </p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="hover-elevate">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                <Monitor className="w-6 h-6" />
                Stream Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Passcode Input - Simple input for Android TV compatibility */}
              <div className="flex flex-col items-center space-y-3">
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-12 w-12 text-xl border-2 rounded-md flex items-center justify-center bg-background font-mono"
                    >
                      {passcode[index] ? '•' : ''}
                    </div>
                  ))}
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                    setPasscode(value);
                  }}
                  placeholder="Enter 4-digit code"
                  className="w-48 text-center text-xl tracking-widest"
                  data-testid="input-passcode"
                  disabled={lockoutState.isLocked}
                  autoFocus
                />

                {/* Status Message */}
                {lockoutState.isLocked ? (
                  <div className="flex items-center gap-2 text-destructive text-lg font-medium">
                    <Lock className="w-5 h-5" />
                    <span data-testid="text-lockout-countdown">
                      Locked - Try again in {formatCountdown(lockoutState.countdown)}
                    </span>
                  </div>
                ) : passcode.length === 4 ? (
                  <div className="flex items-center gap-2 text-primary text-lg font-medium">
                    <CheckCircle className="w-5 h-5" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg">
                    {4 - passcode.length} digits remaining
                  </p>
                )}
              </div>

            </CardContent>
          </Card>

          {/* FireStick APK Download */}
          <Card className="hover-elevate">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">FireStick App</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download the OBTV app for Amazon FireStick
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full hover-elevate active-elevate-2"
                  data-testid="button-download-apk"
                >
                  <a href="/api/download/firestick-apk" target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download APK
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Logo Animation Overlay */}
      <LogoAnimation 
        isVisible={showLogoAnimation}
        onComplete={handleAnimationComplete}
      />
    </div>
  );
}