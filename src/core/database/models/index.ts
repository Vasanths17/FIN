import EmergencyContact from '../../../features/sos/models/EmergencyContact';
import SOSLog from '../../../features/sos/models/SOSLog';
import AnchorEvent from '../../../features/anchor/models/AnchorEvent';
import MOBEvent from '../../../features/mob/models/MOBEvent';
import Trip from '../../../features/trip/models/Trip';
import Breadcrumb from '../../../features/trip/models/Breadcrumb';
import Hotspot from '../../../features/hotspot/models/Hotspot';

export const allModels = [
  EmergencyContact,
  SOSLog,
  AnchorEvent,
  MOBEvent,
  Trip,
  Breadcrumb,
  Hotspot,
];

export {
  EmergencyContact,
  SOSLog,
  AnchorEvent,
  MOBEvent,
  Trip,
  Breadcrumb,
  Hotspot,
};
