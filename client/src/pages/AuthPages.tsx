import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { KeyRound, Mail, User, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// Define schemas
const loginSchema = z.object({
  email: z.string().email({ message: 'Provide a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  rememberMe: z.boolean().default(false)
});

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Provide a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' })
});

const forgotSchema = z.object({
  email: z.string().email({ message: 'Provide a valid email address.' })
});

const resetSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' })
});

interface AuthPagesProps {
  isLogin?: boolean;
  isForgot?: boolean;
  isReset?: boolean;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ isLogin = false, isForgot = false, isReset = false }) => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [submitting, setSubmitting] = useState(false);

  const activeSchema = isForgot
    ? forgotSchema
    : isReset
    ? resetSchema
    : isLogin
    ? loginSchema
    : signupSchema;

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(activeSchema)
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (isForgot) {
        const res = await api.post('/auth/forgot-password', { email: data.email });
        toast.success(res.data.message || 'Password reset link sent.');
        navigate('/login');
      } else if (isReset) {
        const res = await api.post(`/auth/reset-password/${token}`, { password: data.password });
        toast.success(res.data.message || 'Password reset completed.');
        navigate('/login');
      } else if (isLogin) {
        await login(data.email, data.password, data.rememberMe);
        navigate('/dashboard');
      } else {
        await signup(data.name, data.email, data.password);
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Auth action failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md flat-card"
      >
        <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-light-secondary hover:text-light-primary mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-light-primary">
            {isForgot
              ? 'Recover Password'
              : isReset
              ? 'Reset Password'
              : isLogin
              ? 'Welcome Back'
              : 'Create Account'}
          </h2>
          <p className="text-xs text-light-secondary mt-1.5">
            {isForgot
              ? 'Enter email to receive recovery instructions.'
              : isReset
              ? 'Create a strong, secure new password.'
              : isLogin
              ? 'Unlock your PDF & image editing workspace.'
              : 'Start converting files in seconds.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isForgot && !isReset && !isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-light-secondary">Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-secondary/40" />
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('name')}
                  className="w-full bg-midnight/5 border border-stone-accent rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-midnight/30 transition-colors text-light-primary placeholder-light-secondary/30"
                />
              </div>
              {errors.name && <p className="text-[10px] text-danger">{errors.name.message as string}</p>}
            </div>
          )}

          {!isReset && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-light-secondary">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-secondary/40" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="w-full bg-midnight/5 border border-stone-accent rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-midnight/30 transition-colors text-light-primary placeholder-light-secondary/30"
                />
              </div>
              {errors.email && <p className="text-[10px] text-danger">{errors.email.message as string}</p>}
            </div>
          )}

          {!isForgot && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-light-secondary">Password</label>
                {isLogin && (
                  <Link to="/forgot-password" className="text-[10px] text-light-secondary hover:text-light-primary hover:underline">
                    Forgot?
                  </Link>
                )}
              </div>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-secondary/40" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full bg-midnight/5 border border-stone-accent rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-midnight/30 transition-colors text-light-primary placeholder-light-secondary/30"
                />
              </div>
              {errors.password && <p className="text-[10px] text-danger">{errors.password.message as string}</p>}
            </div>
          )}

          {isLogin && (
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded border-stone-accent accent-orange-accent text-orange-accent cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-[11px] text-light-secondary ml-2 select-none cursor-pointer">
                Remember my session details
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 btn-primary text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" /> Submitting...
              </>
            ) : isForgot ? (
              'Send Reset Instructions'
            ) : isReset ? (
              'Change Password'
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="text-center mt-6 text-xs text-light-secondary">
          {isLogin ? (
            <p>
              New to ConvertEase?{' '}
              <Link to="/signup" className="text-orange-accent hover:text-orange-accent/80 font-bold">
                Sign Up
              </Link>
            </p>
          ) : !isForgot && !isReset ? (
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-orange-accent hover:text-orange-accent/80 font-bold">
                Sign In
              </Link>
            </p>
          ) : (
            <Link to="/login" className="text-orange-accent hover:text-orange-accent/80 font-bold block mt-2">
              Back to login page
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
};
