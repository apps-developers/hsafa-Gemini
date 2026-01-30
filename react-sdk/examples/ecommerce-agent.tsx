/**
 * E-commerce AI Agent Example
 * 
 * This example shows how to integrate the HSAFA SDK with an e-commerce application.
 * The AI agent can search products, show product details, and process orders.
 */

import React from 'react';
import { 
  HsafaProvider, 
  HsafaChat, 
  useHsafaAction, 
  useHsafaComponent 
} from '@hsafa/ui-sdk';

// Mock data
const products = [
  { id: 1, name: 'Wireless Headphones', price: 99.99, image: '/headphones.jpg', stock: 15 },
  { id: 2, name: 'Smart Watch', price: 199.99, image: '/watch.jpg', stock: 8 },
  { id: 3, name: 'Bluetooth Speaker', price: 79.99, image: '/speaker.jpg', stock: 22 },
];

const orders = new Map();

// Product Card Component
function ProductCard({ product, onAddToCart }: { product: any; onAddToCart: (id: number) => void }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <img 
        src={product.image} 
        alt={product.name}
        className="w-full h-32 object-cover rounded mb-2"
        onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
      />
      <h3 className="font-semibold text-lg">{product.name}</h3>
      <p className="text-gray-600">${product.price}</p>
      <p className="text-sm text-gray-500">Stock: {product.stock}</p>
      <button 
        onClick={() => onAddToCart(product.id)}
        className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        disabled={product.stock === 0}
      >
        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}

// Order Summary Component
function OrderSummary({ order }: { order: any }) {
  return (
    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
      <h3 className="font-semibold text-lg text-green-800">Order Confirmed!</h3>
      <div className="mt-2 space-y-1">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Total:</strong> ${order.total}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Estimated Delivery:</strong> {order.estimatedDelivery}</p>
      </div>
    </div>
  );
}

// Component that provides actions and components to the AI agent
function EcommerceActionProvider() {
  // Action: Search for products
  useHsafaAction('searchProducts', async (params) => {
    const { query } = params;
    console.log('🔍 Searching products:', query);
    
    // Simple search implementation
    const results = products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      success: true,
      products: results,
      total: results.length
    };
  });

  // Action: Get product details
  useHsafaAction('getProduct', async (params) => {
    const { productId } = params;
    console.log('📦 Getting product:', productId);
    
    const product = products.find(p => p.id === parseInt(productId));
    
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    
    return {
      success: true,
      product
    };
  });

  // Action: Create order
  useHsafaAction('createOrder', async (params) => {
    const { productId, quantity = 1, customerInfo } = params;
    console.log('🛒 Creating order:', { productId, quantity, customerInfo });
    
    const product = products.find(p => p.id === parseInt(productId));
    
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    
    if (product.stock < quantity) {
      return { success: false, error: 'Insufficient stock' };
    }
    
    // Create order
    const orderId = `ORD-${Date.now()}`;
    const order = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      total: (product.price * quantity).toFixed(2),
      status: 'confirmed',
      customerInfo,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
    
    orders.set(orderId, order);
    
    // Update stock
    product.stock -= quantity;
    
    return {
      success: true,
      order
    };
  });

  // Action: Check order status
  useHsafaAction('checkOrder', async (params) => {
    const { orderId } = params;
    console.log('📋 Checking order:', orderId);
    
    const order = orders.get(orderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    return {
      success: true,
      order
    };
  });

  // Component: Product grid
  useHsafaComponent('ProductGrid', ({ products: productList }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {productList.map((product: any) => (
        <ProductCard 
          key={product.id} 
          product={product}
          onAddToCart={(id) => console.log('Add to cart clicked:', id)}
        />
      ))}
    </div>
  ));

  // Component: Single product display
  useHsafaComponent('ProductDisplay', ({ product }) => (
    <ProductCard 
      product={product}
      onAddToCart={(id) => console.log('Add to cart clicked:', id)}
    />
  ));

  // Component: Order confirmation
  useHsafaComponent('OrderConfirmation', ({ order }) => (
    <OrderSummary order={order} />
  ));

  return null;
}

// Main E-commerce AI Agent App
export function EcommerceAgentExample() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          E-commerce AI Assistant
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <HsafaProvider baseUrl="http://localhost:3900">
            <EcommerceActionProvider />
            
            <div className="flex justify-center">
              <HsafaChat
                agentId="ecommerce-agent"
                width={500}
                height={600}
                placeholder="Ask me about products, orders, or anything else!"
                welcomeMessage="Hello! I'm your shopping assistant. I can help you find products, check prices, and place orders. What are you looking for today?"
                primaryColor="#3b82f6"
                backgroundColor="#ffffff"
              />
            </div>
            
            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Try asking:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• "Show me all products"</li>
                <li>• "Search for headphones"</li>
                <li>• "I want to buy a smart watch"</li>
                <li>• "Check my order status"</li>
                <li>• "What's the price of the bluetooth speaker?"</li>
              </ul>
            </div>
          </HsafaProvider>
        </div>
      </div>
    </div>
  );
}

export default EcommerceAgentExample;
