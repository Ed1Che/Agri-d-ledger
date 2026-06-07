const { createClient } = require('@supabase/supabase-js')
const ws = require('ws') // 1. Bring in the websocket library
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    realtime: {
      transport: ws // 2. Tell Supabase to use 'ws' for its connection
    }
  }
)

module.exports = supabase