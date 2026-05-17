import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '../../../core/database/database';
import EmergencyContact from '../models/EmergencyContact';
import SOSLog from '../models/SOSLog';

// Graceful import — react-native-sms requires native setup
let SendSMS: any = null;
try {
  SendSMS = require('react-native-sms').default ?? require('react-native-sms');
} catch {
  console.warn('[SOSService] react-native-sms not available');
}

export interface SOSContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export interface SOSResult {
  sent: boolean;
  contact: SOSContact;
  error?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const toMariner = (val: number, isLat: boolean): string => {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(2);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${deg}°${min}'${dir}`;
};

const getISTTimestamp = (): string => {
  const now = new Date();
  // UTC+5:30
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return ist.toISOString().replace('T', ' ').substring(0, 19) + ' IST';
};

const buildSMSBody = (
  vesselName: string,
  lat: number,
  lng: number,
  speed: number,
  heading: number,
): string =>
  `🚨 MARITIME SOS 🚨
Vessel: ${vesselName}
Time: ${getISTTimestamp()}
Position: ${toMariner(lat, true)}, ${toMariner(lng, false)}
Google Maps: https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}
Speed: ${speed.toFixed(1)} knots, Heading: ${Math.round(heading)}°
PLEASE ALERT COAST GUARD: 1554`;

const sendOneSMS = (phone: string, body: string): Promise<boolean> => {
  return new Promise(resolve => {
    if (!SendSMS) {
      console.log('[SOSService] SMS (mock):', phone, body.substring(0, 40));
      resolve(true);
      return;
    }
    try {
      SendSMS.send(
        {
          body,
          recipients: [phone],
          successTypes: ['sent', 'queued'],
          allowAndroidSendWithoutReadPermission: true,
        },
        (completed: boolean, cancelled: boolean, error: string | null) => {
          if (error) {
            console.error('[SOSService] SMS error for', phone, error);
            resolve(false);
          } else {
            resolve(completed && !cancelled);
          }
        },
      );
    } catch (e) {
      console.error('[SOSService] SMS exception:', e);
      resolve(false);
    }
  });
};

// ─── service ──────────────────────────────────────────────────────────────────

class SOSService {
  async getEmergencyContacts(): Promise<SOSContact[]> {
    try {
      const rows = await database
        .get<EmergencyContact>('emergency_contacts')
        .query()
        .fetch();
      return rows
        .map(r => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          relationship: r.relationship,
          isPrimary: r.isPrimary,
        }))
        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    } catch (e) {
      console.error('[SOSService] getContacts error:', e);
      return [];
    }
  }

  async addContact(
    name: string,
    phone: string,
    relationship: string,
    isPrimary: boolean,
  ): Promise<void> {
    await database.write(async () => {
      await database.get<EmergencyContact>('emergency_contacts').create(c => {
        c.name = name;
        c.phone = phone;
        c.relationship = relationship;
        c.isPrimary = isPrimary;
      });
    });
  }

  async deleteContact(id: string): Promise<void> {
    await database.write(async () => {
      const contact = await database
        .get<EmergencyContact>('emergency_contacts')
        .find(id);
      await contact.destroyPermanently();
    });
  }

  async seedCoastGuard(): Promise<void> {
    const contacts = await this.getEmergencyContacts();
    if (contacts.length === 0) {
      await this.addContact('Indian Coast Guard', '1554', 'Coast Guard', true);
    }
  }

  async sendSOS(
    lat: number,
    lng: number,
    speed: number,
    heading: number,
    onProgress?: (result: SOSResult) => void,
  ): Promise<SOSResult[]> {
    const vesselName =
      (await AsyncStorage.getItem('@mg_vessel_name')) ?? 'Unknown Vessel';
    const contacts = await this.getEmergencyContacts();

    if (contacts.length === 0) {
      await this.seedCoastGuard();
      contacts.push(...(await this.getEmergencyContacts()));
    }

    const body = buildSMSBody(vesselName, lat, lng, speed, heading);
    const results: SOSResult[] = [];

    for (const contact of contacts) {
      const sent = await sendOneSMS(contact.phone, body);
      const result: SOSResult = { sent, contact };
      results.push(result);
      onProgress?.(result);
    }

    // Fire-and-forget DB log
    this.logSOS(lat, lng, speed, heading, results).catch(console.error);

    return results;
  }

  private async logSOS(
    lat: number,
    lng: number,
    speed: number,
    heading: number,
    results: SOSResult[],
  ): Promise<void> {
    try {
      const notified = results
        .filter(r => r.sent)
        .map(r => r.contact.phone)
        .join(',');
      const status = results.every(r => r.sent) ? 'all_sent' : 'partial';
      await database.write(async () => {
        await database.get<SOSLog>('sos_logs').create(log => {
          log.latitude = lat;
          log.longitude = lng;
          log.speed = speed;
          log.heading = heading;
          log.contactsNotified = notified;
          log.status = status;
        });
      });
    } catch (e) {
      console.error('[SOSService] logSOS error:', e);
    }
  }
}

export default new SOSService();
