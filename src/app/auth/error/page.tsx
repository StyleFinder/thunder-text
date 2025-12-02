'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-semibold text-oxford-900 mb-2">
                Authentication Error
              </h1>
              <p className="text-gray-600">
                There was a problem signing you in
              </p>
            </div>

            <div className="mb-6">
              <Alert variant="destructive" className="bg-berry-50 border-berry-500">
                <AlertDescription className="text-berry-700">
                  {getErrorMessage(error)}
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-3 justify-center">
              <Button asChild className="bg-smart-500 hover:bg-smart-600">
                <Link href="/auth/login">
                  Try Again
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/signup">
                  Create Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
