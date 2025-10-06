"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../db/supabase");
(async () => {
    const { count, error } = await supabase_1.supabaseAdmin
        .from('shoe_results')
        .select('id', { count: 'exact', head: true });
    if (error) {
        console.error('❌ Supabase error:', error.message);
        process.exit(1);
    }
    console.log('✅ Supabase OK. shoe_results count =', count);
})();
//# sourceMappingURL=check_supabase.js.map