import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import { allModels } from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'maritimeguard',
  // jsi: true, // Enable for better performance (requires JSI setup in android/CMakeLists.txt)
  onSetUpError: (error: Error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: allModels,
});

export default database;
