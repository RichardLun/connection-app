// Connects the app to the Supabase database.
// Richard set this up. If something here needs to change, ask him.
//
// The publishable key is meant to be used in browser code, so it's fine
// for it to be in the repo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ngstaicldvasddmdypdp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5k_3Dsw2SFbErWzYMSjoGQ_pLvcc2LL";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
