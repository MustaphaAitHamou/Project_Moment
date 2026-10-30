import { CardGridSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-page space-y-6 py-8" aria-busy="true">
      <Skeleton className="h-10 w-72" />
      <CardGridSkeleton />
    </div>
  );
}
