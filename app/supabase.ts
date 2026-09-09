import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmdyemgxqlztdogtavxe.supabase.co';
const supabasePublishableKey = 'sb_publishable_Y7rzcvFCtThD8Mxp3SFawQ_mYiC127y';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
