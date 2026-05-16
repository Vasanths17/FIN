import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class AnchorEvent extends Model {
  static table = 'anchor_events';

  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('radius') radius!: number;
  @date('dropped_at') droppedAt!: Date;
  @date('lifted_at') liftedAt!: Date | null;
  @field('max_drift') maxDrift!: number;
  @field('drag_alert_count') dragAlertCount!: number;
}
