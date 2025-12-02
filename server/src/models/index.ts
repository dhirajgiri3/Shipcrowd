import User, { IUser } from './User';
import Company, { ICompany } from './Company';
import Order, { IOrder } from './Order';
import Shipment, { IShipment } from './Shipment';
import RateCard, { IRateCard } from './RateCard';
import Zone, { IZone } from './Zone';
import Integration, { IIntegration } from './Integration';
import AuditLog, { IAuditLog } from './AuditLog';
import Warehouse, { IWarehouse } from './Warehouse';
import Coupon, { ICoupon } from './Coupon';
import KYC, { IKYC } from './KYC';
import Permission, { IPermission } from './Permission';
import TeamInvitation, { ITeamInvitation } from './TeamInvitation';

// Export models
export {
  User,
  Company,
  Order,
  Shipment,
  RateCard,
  Zone,
  Integration,
  AuditLog,
  Warehouse,
  Coupon,
  KYC,
  Permission,
  TeamInvitation,
};

// Export interfaces
export type {
  IUser,
  ICompany,
  IOrder,
  IShipment,
  IRateCard,
  IZone,
  IIntegration,
  IAuditLog,
  IWarehouse,
  ICoupon,
  IKYC,
  IPermission,
  ITeamInvitation,
};
