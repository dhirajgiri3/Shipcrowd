# Shipcrowd Warehouse Management System Documentation

## Overview

The Warehouse Management System in Shipcrowd allows businesses to manage their physical storage locations from which products are shipped to customers. The system enables centralized storage management, streamlined order fulfillment, operational efficiency, and logistics coordination.

## Key Features

- **Multiple Warehouse Management**: Create and manage multiple warehouses across different locations
- **Default Warehouse**: Designate a default warehouse for standard operations
- **Operating Hours**: Define operating hours for each day of the week, including closed days
- **Address Management**: Store complete location information including coordinates for mapping
- **Contact Information**: Maintain primary contact person, phone numbers, and email for each warehouse
- **CSV Import**: Bulk import warehouses using CSV files

## API Endpoints

### Create Warehouse
- **Endpoint**: `POST /api/warehouses`
- **Description**: Creates a new warehouse
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "name": "Main Warehouse",
    "address": {
      "line1": "123 Logistics Park",
      "line2": "Sector 5",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    },
    "contactInfo": {
      "name": "Warehouse Manager",
      "phone": "+919876543210",
      "email": "warehouse@example.com",
      "alternatePhone": "+919876543211"
    },
    "operatingHours": {
      "monday": {"open": "09:00", "close": "18:00"},
      "tuesday": {"open": "09:00", "close": "18:00"},
      "wednesday": {"open": "09:00", "close": "18:00"},
      "thursday": {"open": "09:00", "close": "18:00"},
      "friday": {"open": "09:00", "close": "18:00"},
      "saturday": {"open": "10:00", "close": "15:00"},
      "sunday": {"open": null, "close": null}
    },
    "isDefault": true
  }
  ```
- **Response**: Returns the created warehouse with formatted operating hours

### Get All Warehouses
- **Endpoint**: `GET /api/warehouses`
- **Description**: Retrieves all warehouses for the current user's company
- **Authentication**: Required
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Number of warehouses per page (default: 10)
  - `search`: Search term for warehouse name, city, or postal code
- **Response**: Returns a list of warehouses with pagination information

### Get Warehouse by ID
- **Endpoint**: `GET /api/warehouses/:warehouseId`
- **Description**: Retrieves a specific warehouse by ID
- **Authentication**: Required
- **Response**: Returns the warehouse details with formatted operating hours

### Update Warehouse
- **Endpoint**: `PATCH /api/warehouses/:warehouseId`
- **Description**: Updates an existing warehouse
- **Authentication**: Required
- **Request Body**: Same as create warehouse, but all fields are optional
- **Response**: Returns the updated warehouse with formatted operating hours

### Delete Warehouse
- **Endpoint**: `DELETE /api/warehouses/:warehouseId`
- **Description**: Soft deletes a warehouse (marks as deleted)
- **Authentication**: Required
- **Response**: Returns a success message

### Import Warehouses
- **Endpoint**: `POST /api/warehouses/import`
- **Description**: Imports warehouses from a CSV file
- **Authentication**: Required
- **Request**: Multipart form data with a CSV file
- **Response**: Returns the imported warehouses and any errors

## Operating Hours

The system now supports proper handling of operating hours, including closed days:

- Days can be marked as closed by setting both `open` and `close` to `null`
- Operating hours are formatted for display in the API response
- The system automatically handles empty strings, null values, and undefined values

### Example of Formatted Operating Hours

```json
{
  "formattedHours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 3:00 PM",
    "sunday": "Closed"
  }
}
```

## CSV Import Format

When importing warehouses via CSV, the following columns are supported:

- `name`: Warehouse name (required)
- `address_line1`: Address line 1 (required)
- `address_line2`: Address line 2 (optional)
- `city`: City (required)
- `state`: State (required)
- `country`: Country (optional, defaults to "India")
- `postal_code`: Postal code (required)
- `contact_name`: Contact person name (required)
- `contact_phone`: Contact phone number (required)
- `contact_email`: Contact email (optional)
- `alternate_phone`: Alternate phone number (optional)
- `monday_open`, `monday_close`, `tuesday_open`, etc.: Operating hours for each day

## Integration with Other Systems

The warehouse management system integrates with:

1. **Order Management**: Warehouses are used as pickup locations for orders
2. **Shipment Processing**: Warehouse information is included in shipment details
3. **Courier Services**: Warehouse addresses are used for pickup coordination
4. **Company Settings**: Default warehouse is stored in company settings

## Best Practices

1. **Always have a default warehouse**: Each company should have at least one default warehouse
2. **Use descriptive names**: Warehouse names should be clear and descriptive
3. **Provide accurate contact information**: Ensure contact details are up-to-date
4. **Set correct operating hours**: Properly configure operating hours for each day
5. **Use CSV import for bulk operations**: When adding multiple warehouses, use the CSV import feature
