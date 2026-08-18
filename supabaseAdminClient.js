require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : require('./supabaseClient');

module.exports = supabaseAdmin;
