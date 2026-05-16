import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class EmergencyContact extends Model {
  static table = 'emergency_contacts';

  @field('name') name!: string;
  @field('phone') phone!: string;
  @field('relationship') relationship!: string;
  @field('is_primary') isPrimary!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
