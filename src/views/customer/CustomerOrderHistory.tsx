import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, Review } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotification } from '../../context/NotificationContext';
import { ReviewComponent } from '../../components/ReviewComponent';
import { OrderCardSkeleton } from '../../components/Skeletons';
import { Star, RefreshCw, ChevronRight, MessageSquare, Check, X, RotateCcw, Download } from 'lucide-react';

interface CustomerOrderHistoryProps {
  onSelectOrderToTrack: (orderId: string) => void;
  onNavigateToCart: () => void;
}

export const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({
  onSelectOrderToTrack,
  onNavigateToCart
}) => {
  const { currentUser, settings } = useAuth();
  const { addToCart } = useCart();
  const { addNotification } = useNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'PAST' | 'CANCELLED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);

  // Review Modal State
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);

  const loadOrders = async () => {
    if (!currentUser) return;
    try {
      const data = await apiService.getOrders({ role: 'CUSTOMER', userId: currentUser.id });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentUser]);

  const activeOrders = (orders || []).filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED'
  );
  const pastOrders = (orders || []).filter((o) => o.status === 'DELIVERED');
  const cancelledOrders = (orders || []).filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED');

  const handleReorder = async (order: Order) => {
    setReorderingOrderId(order.id);
    try {
      const menu = await apiService.getMenu();
      const safeMenu = Array.isArray(menu) ? menu : [];
      let addedItemCount = 0;

      for (const item of (order.items || [])) {
        const menuItem = safeMenu.find((x) => x.id === item.menuItemId);
        if (menuItem) {
          addToCart(menuItem, item.quantity, item.customizations || [], item.addons || [], item.specialInstructions);
          addedItemCount += item.quantity;
        }
      }

      addNotification({
        title: '🛒 Items Reordered!',
        message: `Added ${addedItemCount} item(s) from Order #${order.orderNumber} to your cart.`,
        type: 'SUCCESS'
      });

      onNavigateToCart();
    } catch (err) {
      console.error('Error reordering items:', err);
    } finally {
      setReorderingOrderId(null);
    }
  };

  const generateOrderReceiptPDF = (order: Order) => {
    const doc = new jsPDF();
    
    const primaryColor = [28, 25, 23]; // stone-900 / Dark Charcoal
    const secondaryColor = [120, 113, 108]; // stone-500 / Muted Gray
    const accentColor = [220, 38, 38]; // red-600 / Red Brand Accent
    
    // Top Decorative Accent Bar (Modern Invoice Header)
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 4, 'F'); // Full width top thin accent line
    
    // Brand Initial Square (Mini Logo)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("HK", 17.5, 20);
    
    // Company Information
    const restName = settings?.restaurantName || "Hunter's Kitchen";
    const restAddress = settings?.address || "42 Richmond Road, Shanthi Nagar, Bengaluru";
    const restPhone = settings?.phone || "+91 98765 00000";
    const restEmail = settings?.email || "contact@hunterskitchen.com";

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.setFont("Helvetica", "bold");
    doc.text(restName, 30, 19);
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${restAddress} | Phone: ${restPhone} | Email: ${restEmail}`, 30, 24);
    
    // Horizontal divider
    doc.setDrawColor(231, 229, 228); // stone-200
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);
    
    // Title of Document
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TAX INVOICE / ORDER RECEIPT", 14, 36);
    
    // Invoice Meta Information Block (Two Columns)
    // Left Column
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.text("INVOICE DETAILS", 14, 43);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(87, 80, 74); // stone-600
    doc.text(`Invoice No:    #${order.orderNumber}`, 14, 48);
    doc.text(`Date & Time:   ${new Date(order.createdAt).toLocaleString()}`, 14, 53);
    
    const deliveryAddressStr = order.deliveryAddress 
      ? `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}`.trim()
      : '';
    const hasDelivery = deliveryAddressStr.length > 3;

    doc.text(`Fulfillment:   ${hasDelivery ? "Home Delivery" : "Self Pickup"}`, 14, 58);
    if (!hasDelivery) {
      doc.text(`Pickup Hub:    ${restAddress.split(',')[0] || "Main Hub"}`, 14, 63);
    } else {
      const displayAddr = deliveryAddressStr.length > 40 ? deliveryAddressStr.substring(0, 37) + "..." : deliveryAddressStr;
      doc.text(`Deliver To:    ${displayAddr}`, 14, 63);
    }
    
    // Right Column
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CUSTOMER DETAILS", 120, 43);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(87, 80, 74);
    doc.text(`Customer:      ${order.customerName}`, 120, 48);
    doc.text(`Phone:         ${order.customerPhone}`, 120, 53);
    doc.text(`Payment Mode:  ${order.paymentMethod === 'ONLINE' ? 'Online Payment' : 'Cash on Delivery'}`, 120, 58);
    const isPaid = order.paymentStatus === 'VERIFIED' || order.paymentStatus === 'PAID_CASH';
    doc.text(`Status:        ${isPaid ? 'PAID (100% Secure)' : 'PENDING'}`, 120, 63);
    
    // Table Setup
    const tableColumn = ["#", "Item Name & Customization", "Price", "Qty", "Total"];
    const tableRows = (order.items || []).map((item, index) => {
      // Build customizations string if any
      const custNames = [
        ...(item.customizations || []).map(c => `${c.optionName}: ${c.selectedLabel}`),
        ...(item.addons || []).map(a => `Addon: ${a.name}`)
      ];
      const itemDesc = custNames.length > 0 ? `${item.name}\n(${custNames.join(', ')})` : item.name;
      
      return [
        (index + 1).toString(),
        itemDesc,
        `Rs. ${item.unitPrice}`,
        item.quantity.toString(),
        `Rs. ${item.totalPrice}`
      ];
    });
    
    // Draw the Table using jspdf-autotable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'striped',
      headStyles: {
        fillColor: [28, 25, 23], // stone-900 / Brand Primary
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        font: 'Helvetica'
      },
    });
    
    // Totals Box Placement
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    
    // Right aligned totals
    const rightAlignX = 196;
    const labelX = 135;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(87, 80, 74);
    
    let currentY = finalY;
    
    // Subtotal
    doc.text("Subtotal:", labelX, currentY);
    doc.text(`Rs. ${order.subtotal}`, rightAlignX, currentY, { align: 'right' });
    currentY += 5;
    
    // Discount if any
    if (order.discount > 0) {
      doc.text("Discount:", labelX, currentY);
      doc.text(`-Rs. ${order.discount}`, rightAlignX, currentY, { align: 'right' });
      currentY += 5;
    }
    
    // Delivery Fee
    doc.text("Delivery Fee:", labelX, currentY);
    doc.text(order.deliveryFee > 0 ? `Rs. ${order.deliveryFee}` : "FREE", rightAlignX, currentY, { align: 'right' });
    currentY += 5;
    
    // Taxes
    doc.text("Taxes & Charges (5%):", labelX, currentY);
    doc.text(`Rs. ${order.tax}`, rightAlignX, currentY, { align: 'right' });
    currentY += 6;
    
    // Highlighted grand total bar
    doc.setFillColor(245, 245, 244); // stone-100
    doc.rect(130, currentY - 4, 66, 8, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("GRAND TOTAL:", 134, currentY + 1.5);
    doc.text(`Rs. ${order.grandTotal}`, rightAlignX, currentY + 1.5, { align: 'right' });
    
    currentY += 16;
    
    // Footer closing message
    doc.setDrawColor(240, 238, 237); // stone-100 line
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);
    currentY += 6;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("THANK YOU FOR YOUR PATRONAGE!", 105, currentY, { align: 'center' });
    
    currentY += 4;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("For feedback or order concerns, please email us or reach out via our support lines.", 105, currentY, { align: 'center' });
    
    currentY += 4;
    doc.text("This is an electronically generated receipt. No physical signature is required.", 105, currentY, { align: 'center' });
    
    doc.save(`receipt_${order.orderNumber}.pdf`);
  };

  const displayedOrders =
    filterTab === 'ACTIVE' ? activeOrders : filterTab === 'PAST' ? pastOrders : cancelledOrders;

  return (
    <div className="pb-28 md:pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      <h2 className="text-lg font-black text-stone-900">Your Orders & History</h2>

      {/* Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
        <button
          onClick={() => setFilterTab('ACTIVE')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'ACTIVE' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Active ({activeOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('PAST')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'PAST' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Past ({pastOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('CANCELLED')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'CANCELLED' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Cancelled ({cancelledOrders.length})
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center my-4">
          <p className="text-xs text-stone-500 font-medium">No orders in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedOrders.map((ord) => (
            <div key={ord.id} className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div>
                  <span className="font-extrabold text-xs text-stone-900">#{ord.orderNumber}</span>
                  <p className="text-[11px] text-stone-400">
                    {new Date(ord.createdAt).toLocaleDateString()} • {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    ord.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ord.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}
                >
                  {ord.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Items Snapshot */}
              <div className="space-y-1 text-xs text-stone-700">
                {(ord.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[200px]">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-semibold text-stone-900">₹{it.totalPrice}</span>
                  </div>
                ))}
              </div>

              {(ord.status === 'CANCELLED' || ord.status === 'REJECTED') && (ord.cancellationReason || ord.rejectionReason) && (
                <div className="pt-2 border-t border-stone-100 mt-2 text-[11px] text-red-700 bg-red-50 p-2 rounded-lg font-medium">
                  <span className="font-bold">Reason:</span> {ord.cancellationReason || ord.rejectionReason}
                </div>
              )}

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
                <span className="text-stone-500">Total Paid: ₹{ord.grandTotal}</span>

                <div className="flex items-center gap-2">
                  {filterTab === 'ACTIVE' && (
                    <button
                      onClick={() => onSelectOrderToTrack(ord.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      Track Order <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(ord.status === 'DELIVERED' || filterTab === 'PAST') && (
                    <>
                      <button
                        onClick={() => generateOrderReceiptPDF(ord)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold flex items-center gap-1 hover:bg-stone-200 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>

                      {!ord.hasBeenReviewed && (
                        <button
                          onClick={() => setSelectedOrderForReview(ord)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 hover:bg-amber-100 transition-all"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate
                        </button>
                      )}

                      <button
                        onClick={() => handleReorder(ord)}
                        disabled={reorderingOrderId === ord.id}
                        className="px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reorderingOrderId === ord.id ? 'animate-spin' : ''}`} />
                        {reorderingOrderId === ord.id ? 'Adding...' : 'Reorder'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedOrderForReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <ReviewComponent
              order={selectedOrderForReview}
              onCancel={() => setSelectedOrderForReview(null)}
              onSuccess={() => {
                setSelectedOrderForReview(null);
                loadOrders();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
