import React, { useRef } from 'react';
import { Sale } from '../../types';
import { useShop } from '../../context/ShopContext';
import { Printer, X, Store, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, isOpen, onClose }) => {
  // settings থেকে ডায়নামিক ডেটা নেওয়া হচ্ছে
  const { settings, formatCurrency } = useShop();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const is58mm = settings.invoice_design === '58mm';

  let invoiceItems: any[] = [];
  try {
    const saleData = sale as any;
    let rawItems = saleData.items || saleData.cart || saleData.products || saleData.cart_items;
    
    if (typeof rawItems === 'string') {
      try {
        let parsed = JSON.parse(rawItems);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        invoiceItems = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        invoiceItems = [];
      }
    } else if (Array.isArray(rawItems)) {
      invoiceItems = rawItems;
    }
  } catch (error) {
    console.error("Error parsing items:", error);
  }

  // Fallback values যদি settings এ ডেটা না থাকে
  const displayShopName = settings.shop_name || 'মোবাশ্বিরা পশু পাখির ঔষধ ঘর';
  const displayAddress = settings.address || 'বটতলী মোড়, বামনডাঙ্গা, সুন্দরগঞ্জ, গাইবান্ধা';
  const displayPhone = settings.phone || '01788183164';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/80 dark:border-slate-700/60 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8"
        >
          {/* Top Actions */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 print:hidden">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-full uppercase tracking-wider">
                Invoice Preview ({settings.invoice_design})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div ref={printRef} className={`mt-4 p-6 bg-white text-slate-900 font-sans print:p-0 ${is58mm ? 'max-w-xs mx-auto border border-dashed border-slate-300 p-4' : ''}`}>
            
            {/* Header / Shop Info - এখানে ডায়নামিক ডেটা বসানো হয়েছে */}
            <div className="text-center pb-4 border-b border-slate-200">
              {settings.logo && (
                <img src={settings.logo} alt="Logo" className="w-12 h-12 mx-auto rounded-xl object-contain mb-2" />
              )}
              <h2 className="text-2xl font-bold text-slate-800">{displayShopName}</h2>
              <p className="text-slate-600 text-[13px] mt-1">{displayAddress}</p>
              <p className="text-slate-600 text-[13px] mt-0.5 font-medium">মোবাইল: {displayPhone}</p>
              {settings.email && (
                <p className="text-slate-500 text-[12px] mt-0.5">{settings.email}</p>
              )}
            </div>

            {/* Meta Details */}
            <div className="my-4 grid grid-cols-2 text-xs border-b border-slate-200 pb-3 gap-y-1">
              <div>
                <span className="text-slate-500">Invoice No:</span> <strong className="text-slate-900">{sale.invoice_no}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date:</span> <strong className="text-slate-900">{sale.date}</strong>
              </div>
              <div>
                <span className="text-slate-500">Payment:</span> <strong className="uppercase text-slate-900">{sale.payment_method?.replace('_', ' ')}</strong>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left mb-4">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceItems.map((item, idx) => {
                  const itemName = item.product_name || item.name || item.title || 'Unknown Item';
                  const itemQty = item.qty || item.quantity || 1;
                  const itemPrice = item.unit_price || item.price || 0;
                  const itemTotal = item.total_price || item.total || (itemQty * itemPrice);

                  return (
                    <tr key={idx}>
                      <td className="py-2 text-slate-800">
                        <div className="flex items-start gap-1">
                          <span className="text-slate-400 text-[10px] mt-0.5">{idx + 1}.</span>
                          <span className="font-medium">{itemName}</span>
                        </div>
                      </td>
                      <td className="py-2 text-center text-slate-600">{itemQty}</td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(itemPrice)}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{formatCurrency(itemTotal)}</td>
                    </tr>
                  );
                })}
                
                {invoiceItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      কোনো প্রোডাক্ট পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="border-t border-slate-300 pt-3 text-xs space-y-1.5 max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.vat > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT:</span>
                  <span>+{formatCurrency(sale.vat)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Total Amount:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>Paid Amount:</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(sale.paid_amount)}</span>
              </div>
              {sale.due_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Due Amount:</span>
                  <span>{formatCurrency(sale.due_amount)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};