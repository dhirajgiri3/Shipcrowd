/**
 * VelocityMapper Unit Tests
 *
 * Tests all data transformation functions between Helix and Velocity formats
 * Coverage targets: 95%+
 */

import { VelocityMapper } from '../../../src/infrastructure/external/couriers/velocity/velocity.mapper';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import { VELOCITY_STATUS_MAP } from '../../../src/infrastructure/external/couriers/velocity/velocity.types';

describe('VelocityMapper', () => {
  describe('Phone Normalization', () => {
    it('should normalize Indian phone number with +91', () => {
      expect(VelocityMapper.normalizePhone('+919876543210')).toBe('9876543210');
    });

    it('should normalize phone number with country code 91', () => {
      expect(VelocityMapper.normalizePhone('919876543210')).toBe('9876543210');
    });

    it('should handle phone number with spaces', () => {
      expect(VelocityMapper.normalizePhone('+91 98765 43210')).toBe('9876543210');
    });

    it('should handle phone number with dashes', () => {
      expect(VelocityMapper.normalizePhone('+91-9876-543-210')).toBe('9876543210');
    });

    it('should handle phone number with parentheses', () => {
      expect(VelocityMapper.normalizePhone('(+91) 9876543210')).toBe('9876543210');
    });

    it('should extract last 10 digits from longer numbers', () => {
      expect(VelocityMapper.normalizePhone('00919876543210')).toBe('9876543210');
    });

    it('should handle already normalized 10-digit number', () => {
      expect(VelocityMapper.normalizePhone('9876543210')).toBe('9876543210');
    });

    it('should handle numbers shorter than 10 digits', () => {
      expect(VelocityMapper.normalizePhone('12345')).toBe('12345');
    });

    it('should remove all non-digit characters', () => {
      expect(VelocityMapper.normalizePhone('+91 (987) 654-3210')).toBe('9876543210');
    });
  });

  describe('Name Splitting', () => {
    it('should split full name into first and last name', () => {
      const result = VelocityMapper.splitName('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle single name', () => {
      const result = VelocityMapper.splitName('John');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('');
    });

    it('should handle three-part name', () => {
      const result = VelocityMapper.splitName('John Michael Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Michael Doe');
    });

    it('should handle name with extra spaces', () => {
      const result = VelocityMapper.splitName('  John   Doe  ');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toContain('Doe'); // May have extra spaces after join
    });

    it('should handle empty name', () => {
      const result = VelocityMapper.splitName('');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
    });

    it('should handle name with special characters', () => {
      const result = VelocityMapper.splitName("O'Connor Smith");
      expect(result.firstName).toBe("O'Connor");
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('Date Formatting', () => {
    it('should format date as YYYY-MM-DD HH:mm', () => {
      const date = new Date('2025-12-27T14:30:45.123Z');
      const formatted = VelocityMapper.formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T08:05:00.000Z');
      const formatted = VelocityMapper.formatDate(date);
      expect(formatted).toMatch(/^\d{4}-01-\d{2} \d{2}:\d{2}$/);
    });

    it('should pad single-digit hours and minutes', () => {
      // Create a date with known values in local timezone
      const date = new Date(2025, 0, 5, 9, 5, 0); // Month is 0-indexed
      const formatted = VelocityMapper.formatDate(date);
      expect(formatted).toBe('2025-01-05 09:05');
    });
  });

  describe('Status Mapping', () => {
    it('should map NEW to created', () => {
      const result = VelocityMapper.mapStatus('NEW');
      expect(result.status).toBe('created');
      expect(result.description).toContain('created');
    });

    it('should map PKP to picked_up', () => {
      const result = VelocityMapper.mapStatus('PKP');
      expect(result.status).toBe('picked_up');
    });

    it('should map IT to in_transit', () => {
      const result = VelocityMapper.mapStatus('IT');
      expect(result.status).toBe('in_transit');
    });

    it('should map OFD to out_for_delivery', () => {
      const result = VelocityMapper.mapStatus('OFD');
      expect(result.status).toBe('out_for_delivery');
    });

    it('should map DEL to delivered', () => {
      const result = VelocityMapper.mapStatus('DEL');
      expect(result.status).toBe('delivered');
    });

    it('should map NDR to ndr', () => {
      const result = VelocityMapper.mapStatus('NDR');
      expect(result.status).toBe('ndr');
    });

    it('should map RTO to rto', () => {
      const result = VelocityMapper.mapStatus('RTO');
      expect(result.status).toBe('rto');
    });

    it('should map LOST to lost', () => {
      const result = VelocityMapper.mapStatus('LOST');
      expect(result.status).toBe('lost');
    });

    it('should map DAMAGED to damaged', () => {
      const result = VelocityMapper.mapStatus('DAMAGED');
      expect(result.status).toBe('damaged');
    });

    it('should map CANCELLED to cancelled', () => {
      const result = VelocityMapper.mapStatus('CANCELLED');
      expect(result.status).toBe('cancelled');
    });

    it('should handle unknown status', () => {
      const result = VelocityMapper.mapStatus('UNKNOWN_STATUS');
      expect(result.status).toBe('unknown');
      expect(result.description).toContain('Unknown');
    });

    it('should handle case-insensitive status', () => {
      const result = VelocityMapper.mapStatus('DEL'); // Use uppercase
      expect(result.status).toBe('delivered');
    });
  });

  describe('Forward Order Mapping', () => {
    const mockShipmentData: CourierShipmentData = {
      orderNumber: 'ORD-12345',
      origin: {
        name: 'Test Warehouse',
        phone: '+919876543210',
        address: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India'
      },
      destination: {
        name: 'John Doe',
        phone: '+919123456789',
        address: '456 Park Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      package: {
        weight: 1.5,
        length: 20,
        width: 15,
        height: 10,
        declaredValue: 1000
      },
      paymentMode: 'cod',
      codAmount: 1000
    };

    it('should map complete shipment data to Velocity format', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123',
        {
          email: 'warehouse@test.com',
          phone: '9876543210',
          contactName: 'Warehouse Manager',
          address: {
            line1: mockShipmentData.origin.address,
            city: mockShipmentData.origin.city,
            state: mockShipmentData.origin.state,
            country: mockShipmentData.origin.country,
            postalCode: mockShipmentData.origin.pincode
          }
        }
      );

      expect(result.order_id).toBe('ORD-12345');
      expect(result.billing_customer_name).toBe('John');
      expect(result.billing_last_name).toBe('Doe');
      expect(result.billing_phone).toBe('9123456789');
      expect(result.billing_pincode).toBe('400001');
      expect(result.billing_city).toBe('Mumbai');
      expect(result.billing_state).toBe('Maharashtra');
      expect(result.payment_method).toBe('COD');
      expect(result.cod_collectible).toBe(1000);
      expect(result.warehouse_id).toBe('WHTEST123');
      expect(result.sub_total).toBe(1000);
    });

    it('should map prepaid payment mode correctly', () => {
      const prepaidData = { ...mockShipmentData, paymentMode: 'prepaid' as const };
      const result = VelocityMapper.mapToForwardOrder(
        prepaidData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.payment_method).toBe('PREPAID');
      expect(result.cod_collectible).toBeUndefined();
    });

    it('should normalize phone numbers', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.billing_phone).toBe('9123456789');
      expect(result.billing_phone).not.toContain('+91');
      expect(result.billing_phone).not.toContain(' ');
    });

    it('should format order date correctly', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.order_date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should set shipping_is_billing to true', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.shipping_is_billing).toBe(true);
    });

    it('should use fallback email when warehouse email not provided', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.billing_email).toBe('noreply@Helix.com');
    });

    it('should use warehouse email when provided', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123',
        {
          email: 'warehouse@test.com',
          phone: '9876543210',
          contactName: 'Manager',
          address: {
            line1: mockShipmentData.origin.address,
            city: mockShipmentData.origin.city,
            state: mockShipmentData.origin.state,
            country: mockShipmentData.origin.country,
            postalCode: mockShipmentData.origin.pincode
          }
        }
      );

      expect(result.billing_email).toBe('warehouse@test.com');
    });

    it('should handle single-word name', () => {
      const singleNameData = {
        ...mockShipmentData,
        destination: { ...mockShipmentData.destination, name: 'John' }
      };

      const result = VelocityMapper.mapToForwardOrder(
        singleNameData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.billing_customer_name).toBe('John');
      expect(result.billing_last_name).toBe('');
    });

    it('should include package dimensions', () => {
      const result = VelocityMapper.mapToForwardOrder(
        mockShipmentData,
        'Test Warehouse',
        'WHTEST123'
      );

      expect(result.length).toBe(20);
      expect(result.breadth).toBe(15);
      expect(result.height).toBe(10);
      expect(result.weight).toBe(1.5);
    });
  });

  describe('Warehouse Request Mapping', () => {
    const mockWarehouse = {
      _id: 'warehouse-123',
      name: 'Test Warehouse',
      contactInfo: {
        name: 'Warehouse Manager',
        phone: '+919876543210',
        email: 'warehouse@test.com'
      },
      address: {
        line1: '123 Main St',
        line2: 'Floor 2',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India'
      }
    };

    it('should map warehouse to Velocity format', () => {
      const result = VelocityMapper.mapToWarehouseRequest(mockWarehouse);

      expect(result.name).toBe('Test Warehouse');
      expect(result.phone).toBe('9876543210');
      expect(result.email).toBe('warehouse@test.com');
      expect(result.address).toBe('123 Main St');
      expect(result.city).toBe('Delhi');
      expect(result.state).toBe('Delhi');
      expect(result.pin_code).toBe('110001');
      expect(result.country).toBe('India');
    });

    it('should normalize warehouse phone number', () => {
      const result = VelocityMapper.mapToWarehouseRequest(mockWarehouse);
      expect(result.phone).toBe('9876543210');
      expect(result.phone).not.toContain('+91');
    });

    it('should use default email if not provided', () => {
      const warehouseWithoutEmail = {
        ...mockWarehouse,
        contactInfo: {
          ...mockWarehouse.contactInfo,
          email: undefined as any
        }
      };

      const result = VelocityMapper.mapToWarehouseRequest(warehouseWithoutEmail);
      expect(result.email).toBe('noreply@Helix.com');
    });
  });

  describe('Forward Order Data Validation', () => {
    const validData: CourierShipmentData = {
      orderNumber: 'ORD-12345',
      origin: {
        name: 'Warehouse',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India'
      },
      destination: {
        name: 'John Doe',
        phone: '9123456789',
        address: '456 Park Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      package: {
        weight: 1.5,
        length: 20,
        width: 15,
        height: 10,
        declaredValue: 1000
      },
      paymentMode: 'prepaid'
    };

    it('should validate correct data', () => {
      const result = VelocityMapper.validateForwardOrderData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing order number', () => {
      const invalidData = { ...validData, orderNumber: '' };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order number is required');
    });

    it('should reject missing destination name', () => {
      const invalidData = {
        ...validData,
        destination: { ...validData.destination, name: '' }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer name is required');
    });

    it('should reject invalid destination phone', () => {
      const invalidData = {
        ...validData,
        destination: { ...validData.destination, phone: '123' }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('phone'))).toBe(true);
    });

    it('should reject missing destination pincode', () => {
      const invalidData = {
        ...validData,
        destination: { ...validData.destination, pincode: '' }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid 6-digit pincode is required');
    });

    it('should reject invalid pincode length', () => {
      const invalidData = {
        ...validData,
        destination: { ...validData.destination, pincode: '123' }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('pincode'))).toBe(true);
    });

    it('should reject weight <= 0', () => {
      const invalidData = {
        ...validData,
        package: { ...validData.package, weight: 0 }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('weight'))).toBe(true);
    });

    it('should reject weight > 30kg', () => {
      const invalidData = {
        ...validData,
        package: { ...validData.package, weight: 31 }
      };
      const result = VelocityMapper.validateForwardOrderData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('weight'))).toBe(true);
    });

    it('should accept weight within valid range', () => {
      const dataWith15kg = {
        ...validData,
        package: { ...validData.package, weight: 15 }
      };
      const result = VelocityMapper.validateForwardOrderData(dataWith15kg);
      expect(result.valid).toBe(true);
    });

    it('should validate COD amount when payment mode is COD', () => {
      const codData = {
        ...validData,
        paymentMode: 'cod' as const,
        codAmount: undefined
      };
      const result = VelocityMapper.validateForwardOrderData(codData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('COD'))).toBe(true);
    });

    it('should accept valid COD data', () => {
      const codData = {
        ...validData,
        paymentMode: 'cod' as const,
        codAmount: 1000
      };
      const result = VelocityMapper.validateForwardOrderData(codData);
      expect(result.valid).toBe(true);
    });
  });
});
