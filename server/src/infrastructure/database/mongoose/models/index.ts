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

// Week 5: Warehouse Workflow Models
import WarehouseZone, { IWarehouseZone } from './WarehouseZone';
import WarehouseLocation, { IWarehouseLocation } from './WarehouseLocation';
import PickList, { IPickList, IPickListItem } from './PickList';
import Inventory, { IInventory } from './Inventory';
import PackingStation, { IPackingStation } from './PackingStation';
import StockMovement, { IStockMovement } from './StockMovement';

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
  // Week 5: Warehouse Workflow Models
  WarehouseZone,
  WarehouseLocation,
  PickList,
  Inventory,
  PackingStation,
  StockMovement,
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
  // Week 5: Warehouse Workflow Interfaces
  IWarehouseZone,
  IWarehouseLocation,
  IPickList,
  IPickListItem,
  IInventory,
  IPackingStation,
  IStockMovement,
};
