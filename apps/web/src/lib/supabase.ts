import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU'

// Initialize the JS client with streamline schema as default
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'streamline' },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// For server-side operations that require elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcxODgxMywiZXhwIjoyMDY2Mjk0ODEzfQ.placeholder',
  {
    db: { schema: 'streamline' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

