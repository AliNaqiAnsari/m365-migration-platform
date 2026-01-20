'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Icons.alertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-xl font-semibold">Something went wrong!</h2>
      <p className="mb-4 text-muted-foreground">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={() => reset()}>
        <Icons.refresh className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
