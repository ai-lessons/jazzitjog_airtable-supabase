'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;

    const handleAuth = async () => {
      try {
        // Get the hash from URL (Supabase puts tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const errorCode = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        console.log('Hash params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error: errorCode,
          errorDescription
        });

        // Check for error in URL
        if (errorCode) {
          console.error('Auth error from URL:', errorDescription);
          setStatus('error');
          setMessage(`Error: ${errorDescription || errorCode}`);
          return;
        }

        // If no access token yet, retry with limit
        if (!accessToken) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`Waiting for auth tokens... (attempt ${retryCount}/${maxRetries})`);
            setTimeout(handleAuth, 200);
            return;
          } else {
            setStatus('error');
            setMessage('Authentication timed out. Please try logging in again.');
            return;
          }
        }

        // Accept any type of authentication (magiclink, recovery, signup, etc.)
        console.log(`Processing authentication type: ${type || 'unknown'}`);

        // Set session using tokens from hash
        const { data, error } = await supabaseBrowser.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('Auth error:', error);
          setStatus('error');
          setMessage(`Error: ${error.message}`);
          return;
        }

        console.log('Session set successfully:', data.user?.email);
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        setTimeout(() => {
          router.push('/');
        }, 1000);
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8">
        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>{message}</p>
          </div>
        )}
        {status === 'success' && (
          <div>
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-green-600">{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div className="text-red-600 text-4xl mb-4">✗</div>
            <p className="text-red-600">{message}</p>
            <a href="/login" className="underline mt-4 block">Try again</a>
          </div>
        )}
      </div>
    </div>
  );
}
