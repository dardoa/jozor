import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting Tables Schema...');
    
    // Check people table
    const { data: people, error: pErr } = await supabase.from('people').select('*').limit(1);
    if (!pErr && people && people.length > 0) {
        console.log('People Columns Sample:', people[0]);
    } else {
        console.log('People table empty or error:', pErr);
    }

    // Check trees table
    const { data: trees, error: tErr } = await supabase.from('trees').select('*').limit(1);
    if (!tErr && trees && trees.length > 0) {
        console.log('Trees Columns Sample:', trees[0]);
    } else {
        console.log('Trees table empty or error:', tErr);
    }
}

inspectSchema();
