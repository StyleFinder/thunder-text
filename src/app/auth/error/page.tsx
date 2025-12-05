'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Zap, RefreshCw, UserPlus } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  const getErrorTitle = (errorType: string | null) => {
    switch (errorType) {
      case 'Configuration':
        return 'Configuration Error';
      case 'AccessDenied':
        return 'Access Denied';
      case 'Verification':
        return 'Verification Failed';
      case 'CredentialsSignin':
        return 'Login Failed';
      default:
        return 'Authentication Error';
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Thunder Text</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            {/* Error Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(220, 38, 38, 0.1)' }}
            >
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {getErrorTitle(error)}
            </h1>

            {/* Error Message */}
            <p className="text-gray-500 mb-8">
              {getErrorMessage(error)}
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/auth/login" className="block">
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>

              <Link href="/auth/signup" className="block">
                <Button
                  variant="outline"
                  className="w-full h-11 border-gray-200 hover:bg-gray-50"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </Button>
              </Link>
            </div>

            {/* Back link */}
            <div className="pt-6 mt-6 border-t border-gray-200">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                style={{ color: '#0066cc' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
