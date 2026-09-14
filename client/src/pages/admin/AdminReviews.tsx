import { useQuery } from '@tanstack/react-query'
import { engagementApi } from '@/api/growth'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/lib'
import { MessageSquare, Star } from 'lucide-react'

export default function AdminReviews() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => engagementApi.getReviews({ page: 1, limit: 100 }),
    refetchInterval: 30000,
  })
  const reviews = data?.data || []

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <MessageSquare className="w-7 h-7 text-[#7C4EEE]" />
          <span>Reviews</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Monitor customer feedback and product ratings.</p>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground">No reviews yet.</div>
        ) : reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{review.productName || 'Product'}</p>
                <p className="text-xs text-muted-foreground">{review.firstName} {review.lastName} · {formatDate(review.createdAt)}</p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {review.rating}/5
              </Badge>
            </div>
            {review.comment && <p className="mt-4 text-sm text-muted-foreground">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
