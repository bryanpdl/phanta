'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console but show toast to user
    console.error(error);
    toast.error(error.message || 'Something went wrong');
  }, [error]);

  return null; // Return null to prevent any visual error boundary
} 