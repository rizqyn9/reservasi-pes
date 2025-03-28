import { authStore } from "@/store/rsvp-store"
import type { Database } from "@/types/supabase"
import { createClient } from "@supabase/supabase-js"
import { queryOptions } from "@tanstack/react-query"

const supabase = createClient<Database>(
  "https://izaglftduiqoohfhbqou.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YWdsZnRkdWlxb29oZmhicW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNDA4MTMsImV4cCI6MjA1ODcxNjgxM30.8vxZUtyh8M_VThY2aeyRkW1VqD89IMhRQqmY7rkkeQM"
)

const currentUserQry = () => {
  const phone = authStore.getState().phone
  return queryOptions({
    queryKey: ["user", phone],
    enabled: !!phone,
    queryFn: async () => {
      return supabase
        .from("reservation")
        .select("*")
        .eq("phone", phone)
        .single()
    },
  })
}

export { supabase, currentUserQry }
