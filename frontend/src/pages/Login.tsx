import { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'admin@pethub.com';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'admin123';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading) emailRef.current?.focus();
  }, [isAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-white">P</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const triggerShake = () => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 600);
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setFieldErrors({});

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) errors[field] = issue.message;
      });
      setFieldErrors(errors);
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      triggerShake();
      if (err.response) {
        setError(err.response.data?.error || 'Invalid credentials');
      } else if (err.request) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleDemoLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    doLogin(DEMO_EMAIL, DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">Pet Hub</h1>
              <p className="text-sm text-slate-400">Payroll System</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-display font-bold text-white leading-tight">
            Manage your payroll<br />
            <span className="text-primary-400">efficiently</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Streamlined payroll management for all Pet Hub branches. Calculate salaries, track incentives, and generate payslips with ease.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          &copy; 2026 Pet Hub Philippines. All rights reserved.
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">P</span>
              </div>
              <div className="text-left">
                <h1 className="font-display font-bold text-2xl text-slate-900">Pet Hub</h1>
                <p className="text-sm text-slate-500">Payroll System</p>
              </div>
            </div>
          </div>

          <Card className={cn('transition-transform', shouldShake && 'animate-shake')}>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">Welcome back</h2>
                <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm shadow-sm flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={emailRef}
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                      className={cn('pl-10', fieldErrors.email && 'border-red-400 focus-visible:ring-red-200')}
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                      onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                      className={cn('pl-10 pr-10', fieldErrors.password && 'border-red-400 focus-visible:ring-red-200')}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {capsLockOn && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Caps Lock is on
                    </p>
                  )}
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <button type="button" className="text-primary hover:text-primary/80 font-medium">
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full py-3" size="lg">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="mt-4 w-full"
              >
                <span className="text-xs text-muted-foreground mr-1">Demo:</span>
                <span className="font-mono text-xs">{DEMO_EMAIL}</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
