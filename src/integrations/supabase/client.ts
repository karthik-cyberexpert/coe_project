// MIGRATED TO MYSQL - This file now exports the MySQL client adapter
// The MySQL adapter provides a Supabase-compatible API
// Original Supabase config backed up in client.ts.backup

import { mysqlClient } from '@/lib/mysqlClient';

// Export as 'supabase' for backward compatibility
// All existing imports will continue to work without changes
export const supabase = mysqlClient;
