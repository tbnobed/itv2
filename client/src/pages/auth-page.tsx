import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Shield, Monitor, Delete, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { passcodeLoginSchema } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

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
  const [lockoutState, setLockoutState] = useState<LockoutState>({
    isLocked: false,
    retryAfter: 0,
    countdown: 0
  });

  // Redirect if already logged in - use useEffect to avoid early return
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      navigate('/');
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

  const numberButtons = [
    '1', '2', '3',
    '4', '5', '6', 
    '7', '8', '9',
    '', '0', ''
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-primary" />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">OBTV Streaming</h1>
              <p className="text-xl text-muted-foreground">
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
            <CardContent className="space-y-8">
              
              {/* Passcode Display */}
              <div className="flex flex-col items-center space-y-6">
                <InputOTP
                  maxLength={4}
                  value={passcode}
                  onChange={setPasscode}
                  data-testid="input-passcode"
                  disabled={lockoutState.isLocked}
                >
                  <InputOTPGroup className="gap-4">
                    <InputOTPSlot 
                      index={0} 
                      className="h-16 w-16 text-2xl border-2 focus:ring-4 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={1} 
                      className="h-16 w-16 text-2xl border-2 focus:ring-4 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={2} 
                      className="h-16 w-16 text-2xl border-2 focus:ring-4 focus:ring-primary/50" 
                    />
                    <InputOTPSlot 
                      index={3} 
                      className="h-16 w-16 text-2xl border-2 focus:ring-4 focus:ring-primary/50" 
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
              <div className="grid grid-cols-3 gap-3">
                {numberButtons.map((digit, index) => {
                  if (!digit) return <div key={`empty-${index}`} />;
                  
                  return (
                    <Button
                      key={`digit-${digit}`}
                      variant="outline"
                      size="lg"
                      className="h-16 text-2xl font-bold focus:ring-4 focus:ring-primary/50 hover-elevate active-elevate-2"
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
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 text-lg focus:ring-4 focus:ring-primary/50"
                  onClick={handleBackspace}
                  disabled={lockoutState.isLocked || passcode.length === 0}
                  data-testid="button-backspace"
                >
                  <Delete className="w-5 h-5 mr-2" />
                  Clear
                </Button>
                <Button
                  size="lg"
                  className="h-14 text-lg focus:ring-4 focus:ring-primary/50"
                  onClick={handleSubmit}
                  disabled={lockoutState.isLocked || passcode.length !== 4 || passcodeLoginMutation?.isPending}
                  data-testid="button-submit"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {passcodeLoginMutation?.isPending ? 'Checking...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>Use TV remote number keys or on-screen keypad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Auto-submits when 4 digits entered</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}