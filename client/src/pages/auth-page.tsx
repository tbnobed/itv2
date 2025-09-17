import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Shield, Monitor, Delete, CheckCircle, Lock, Download, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { passcodeLoginSchema } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
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
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        const inputOTP = document.querySelector('[data-testid="input-passcode"]') as HTMLElement;
        const activeElement = document.activeElement;
        
        // If we're on the input field, go to first digit button
        if (!activeElement || activeElement === inputOTP || inputOTP?.contains(activeElement)) {
          const firstDigitButton = document.querySelector('[data-testid="button-digit-1"]') as HTMLElement;
          firstDigitButton?.focus();
        }
        // If we're on a digit button, go to clear button
        else if (activeElement?.getAttribute('data-testid')?.startsWith('button-digit-')) {
          const clearButton = document.querySelector('[data-testid="button-backspace"]') as HTMLElement;
          clearButton?.focus();
        }
        // Otherwise focus on the input field first
        else {
          inputOTP?.focus();
        }
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        const activeElement = document.activeElement;
        const inputOTP = document.querySelector('[data-testid="input-passcode"]') as HTMLElement;
        
        // If we're on clear/submit buttons, go back to digit buttons
        if (activeElement?.getAttribute('data-testid') === 'button-backspace' || 
            activeElement?.getAttribute('data-testid') === 'button-submit') {
          const firstDigitButton = document.querySelector('[data-testid="button-digit-1"]') as HTMLElement;
          firstDigitButton?.focus();
        }
        // If we're on digit buttons, go back to input field
        else if (activeElement?.getAttribute('data-testid')?.startsWith('button-digit-')) {
          inputOTP?.focus();
        }
        // Otherwise go to input field
        else {
          inputOTP?.focus();
        }
      } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        const activeElement = document.activeElement as HTMLElement;
        
        // Navigate between digit buttons
        if (activeElement?.getAttribute('data-testid')?.startsWith('button-digit-')) {
          const currentDigit = activeElement.getAttribute('data-testid')?.replace('button-digit-', '');
          const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
          const currentIndex = digits.indexOf(currentDigit || '');
          
          let nextIndex = currentIndex;
          if (key === 'ArrowRight') {
            nextIndex = currentIndex < digits.length - 1 ? currentIndex + 1 : 0;
          } else if (key === 'ArrowLeft') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : digits.length - 1;
          }
          
          const nextButton = document.querySelector(`[data-testid="button-digit-${digits[nextIndex]}"]`) as HTMLElement;
          nextButton?.focus();
        }
        // Navigate between clear and submit buttons
        else if (activeElement?.getAttribute('data-testid') === 'button-backspace') {
          if (key === 'ArrowRight') {
            const submitButton = document.querySelector('[data-testid="button-submit"]') as HTMLElement;
            submitButton?.focus();
          }
        }
        else if (activeElement?.getAttribute('data-testid') === 'button-submit') {
          if (key === 'ArrowLeft') {
            const clearButton = document.querySelector('[data-testid="button-backspace"]') as HTMLElement;
            clearButton?.focus();
          }
        }
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

  const numberButtons = [
    '1', '2', '3',
    '4', '5', '6', 
    '7', '8', '9',
    '', '0', ''
  ];

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
              
              {/* Passcode Display */}
              <div className="flex flex-col items-center space-y-3">
                <InputOTP
                  maxLength={4}
                  value={passcode}
                  onChange={setPasscode}
                  data-testid="input-passcode"
                  disabled={lockoutState.isLocked}
                >
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot 
                      index={0} 
                      className="h-12 w-12 text-xl border-2 focus:ring-2 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={1} 
                      className="h-12 w-12 text-xl border-2 focus:ring-2 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={2} 
                      className="h-12 w-12 text-xl border-2 focus:ring-2 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={3} 
                      className="h-12 w-12 text-xl border-2 focus:ring-2 focus:ring-primary/50" 
                    />
                  </InputOTPGroup>
                </InputOTP>

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

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {numberButtons.map((digit, index) => {
                  if (!digit) return <div key={`empty-${index}`} />;
                  
                  return (
                    <Button
                      key={`digit-${digit}`}
                      variant="outline"
                      className="h-12 text-xl font-bold focus:ring-2 focus:ring-primary/50 hover-elevate active-elevate-2"
                      onClick={() => handleNumberClick(digit)}
                      disabled={lockoutState.isLocked || passcode.length >= 4}
                      data-testid={`button-digit-${digit}`}
                    >
                      {digit}
                    </Button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="h-10 text-base focus:ring-2 focus:ring-primary/50"
                  onClick={handleBackspace}
                  disabled={lockoutState.isLocked || passcode.length === 0}
                  data-testid="button-backspace"
                >
                  <Delete className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  className="h-10 text-base focus:ring-2 focus:ring-primary/50"
                  onClick={handleSubmit}
                  disabled={lockoutState.isLocked || passcode.length !== 4 || passcodeLoginMutation?.isPending}
                  data-testid="button-submit"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {passcodeLoginMutation?.isPending ? 'Checking...' : 'Submit'}
                </Button>
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
                  <a href="/api/download/firestick-apk" download="OBTV-FireStick.apk">
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