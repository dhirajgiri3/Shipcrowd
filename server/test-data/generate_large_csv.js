const fs = require('fs');

// Generate a large CSV for async testing (2000 rows)
const header = 'customer_name,customer_phone,customer_email,address_line1,address_line2,city,state,postal_code,country,product_name,sku,quantity,price,weight,payment_method,payment_status,order_status\n';

const cities = [
    { city: 'Mumbai', state: 'Maharashtra', postal: '400001' },
    { city: 'Delhi', state: 'Delhi', postal: '110001' },
    { city: 'Bangalore', state: 'Karnataka', postal: '560001' },
    { city: 'Hyderabad', state: 'Telangana', postal: '500001' },
    { city: 'Chennai', state: 'Tamil Nadu', postal: '600001' },
    { city: 'Kolkata', state: 'West Bengal', postal: '700001' },
    { city: 'Pune', state: 'Maharashtra', postal: '411001' },
    { city: 'Ahmedabad', state: 'Gujarat', postal: '380001' },
];

const products = [
    { name: 'T-Shirt', sku: 'TS', price: 499, weight: 0.3 },
    { name: 'Jeans', sku: 'JN', price: 1299, weight: 0.8 },
    { name: 'Shoes', sku: 'SH', price: 2499, weight: 0.6 },
    { name: 'Watch', sku: 'WT', price: 3999, weight: 0.2 },
    { name: 'Bag', sku: 'BG', price: 1999, weight: 0.5 },
];

let rows = header;
for (let i = 1; i <= 2000; i++) {
    const city = cities[i % cities.length];
    const product = products[i % products.length];
    const phone = `98765${String(i).padStart(5, '0')}`;
    const payment = i % 3 === 0 ? 'cod' : 'prepaid';
    const status = payment === 'cod' ? 'pending' : 'paid';
    
    rows += `Customer ${i},${phone},customer${i}@example.com,${i} Street,,${city.city},${city.state},${city.postal},India,${product.name},${product.sku}-${String(i).padStart(4, '0')},1,${product.price},${product.weight},${payment},${status},pending\n`;
}

fs.writeFileSync('test_bulk_orders_large_2000.csv', rows);
console.log('✅ Generated test_bulk_orders_large_2000.csv with 2000 rows');
