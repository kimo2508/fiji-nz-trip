import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rijeueugeylqkjvobxaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpamV1ZXVnZXlscWtqdm9ieGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODg4OTAsImV4cCI6MjA4ODg2NDg5MH0.LiXxIqIGoEzI4pXF7m5IFxF8vdea46DfPyFIj-d-Ccs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
