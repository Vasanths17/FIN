import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'emergency_contacts',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'relationship', type: 'string' },
        { name: 'is_primary', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sos_logs',
      columns: [
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'speed', type: 'number' },
        { name: 'heading', type: 'number' },
        { name: 'contacts_notified', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'anchor_events',
      columns: [
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'radius', type: 'number' },
        { name: 'dropped_at', type: 'number' },
        { name: 'lifted_at', type: 'number', isOptional: true },
        { name: 'max_drift', type: 'number' },
        { name: 'drag_alert_count', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'mob_events',
      columns: [
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'crew_member_name', type: 'string', isOptional: true },
        { name: 'rescued', type: 'boolean' },
        { name: 'rescued_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'distance_nm', type: 'number' },
        { name: 'avg_speed_knots', type: 'number' },
        { name: 'max_speed_knots', type: 'number' },
        { name: 'breadcrumb_count', type: 'number' },
        { name: 'status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'breadcrumbs',
      columns: [
        { name: 'trip_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'speed', type: 'number' },
        { name: 'heading', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'timestamp', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'hotspots',
      columns: [
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'catch_type', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'rating', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
