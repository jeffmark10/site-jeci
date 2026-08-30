const SUPABASE_URL = "https://bkrwgseqjgdeevtmctju.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcndnc2VxamdkZWV2dG1jdGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTU4MTUsImV4cCI6MjEwMzY3MTgxNX0.dF4-fBv4PcRoD_aweeaDETxMdXBy2-6NEnxZVcEf568";

const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;