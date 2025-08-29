require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('BACKEND_PRIVATE_KEY:', process.env.BACKEND_PRIVATE_KEY ? '✓ Set' : '✗ Not set');
console.log('POLYGON_RPC:', process.env.POLYGON_RPC || 'Not set');
console.log('PORT:', process.env.PORT || 'Using default 4000');
console.log('PINATA_API_KEY:', process.env.PINATA_API_KEY ? '✓ Set' : '✗ Not set');
console.log('PINATA_API_SECRET:', process.env.PINATA_API_SECRET ? '✓ Set' : '✗ Not set');
console.log('==============================='); 