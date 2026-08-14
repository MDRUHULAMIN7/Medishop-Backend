import PDFDocument from 'pdfkit';

export async function generateInvoice(order: any, siteSettings?: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryBlue = '#1D4ED8';
      const textColor = '#0F172A';
      const mutedColor = '#64748B';
      const borderColor = '#E2E8F0';

      const orderNum = order.orderNumber || order.id || 'N/A';
      const invoiceNum = order.invoiceNumber || `INV-${orderNum}`;
      const issueDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US');

      // Dynamic Terms & Policies from Site Settings
      const termsText = siteSettings?.legal?.invoiceTerms || 'Goods once sold are non-refundable unless damaged or incorrect. DGDA verified items.';
      const refundText = siteSettings?.legal?.refundPolicyContent || 'Returns accepted within 7 days with original seal & invoice receipt.';
      const warrantyText = siteSettings?.legal?.warrantyPolicyContent || 'Manufacturer warranty applies where applicable with official invoice.';

      // 1. Header Section
      doc.fillColor(primaryBlue).fontSize(26).font('Helvetica-Bold').text('mediShop', 36, 36);
      doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold').text('DIGITAL PHARMACY  (Verified DGDA #DAR-2026-BD)', 36, 66);
      doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica').text('Hotline: 16780 | Email: support@medishop.com.bd', 36, 79);

      // Invoice Title & Metadata (Right Aligned)
      doc.fillColor(primaryBlue).fontSize(15).font('Helvetica-Bold').text('INVOICE', 360, 36, { align: 'right' });
      doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(`Invoice No: ${invoiceNum}`, 360, 55, { align: 'right' });
      doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica').text(`Order No: ${orderNum}`, 360, 69, { align: 'right' });
      doc.text(`Issue Date: ${issueDate}`, 360, 82, { align: 'right' });

      // Subtle Blue Divider Line
      doc.moveTo(36, 98).lineTo(559, 98).strokeColor(primaryBlue).lineWidth(1.2).stroke();

      // 2. Info Cards Section (BILL TO & ORDER & PAYMENT - Completely BORDERLESS, No Border)
      const cardY = 114;

      // Card 1: BILL TO / SHIP TO (Borderless)
      doc.fillColor(primaryBlue).fontSize(9).font('Helvetica-Bold').text('BILL TO / SHIP TO:', 36, cardY);

      const recipient = order.shippingAddress?.recipientName || order.shippingAddress?.fullName || order.user?.name || 'Customer';
      const phone = order.shippingAddress?.phone || order.user?.phone || 'N/A';
      const email = order.user?.email || order.shippingAddress?.email || '';
      const addrLine = order.shippingAddress?.addressLine || order.shippingAddress?.streetAddress || '';
      const thana = order.shippingAddress?.thana || order.shippingAddress?.area || '';
      const district = order.shippingAddress?.district || 'Dhaka';
      const fullAddr = `${addrLine}, ${thana}, ${district}`.replace(/^,\s*|\s*,\s*$/g, '');

      doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(recipient, 36, cardY + 14);
      doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica').text(`Phone: ${phone}${email ? ` | ${email}` : ''}`, 36, cardY + 28);
      doc.text(`Address: ${fullAddr}`, 36, cardY + 40, { width: 250, height: 28 });

      // Card 2: ORDER & PAYMENT (Borderless)
      const card2X = 320;
      doc.fillColor(primaryBlue).fontSize(9).font('Helvetica-Bold').text('ORDER & PAYMENT:', card2X, cardY);

      const payMethod = typeof order.paymentMethod === 'string' ? order.paymentMethod.toUpperCase() : (order.paymentMethod?.nameEn || 'COD');
      const payStatus = (order.paymentStatus || 'pending').toUpperCase();
      const orderStatus = (order.orderStatus || 'pending').toUpperCase();

      doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica').text(`Order Status: ${orderStatus}`, card2X, cardY + 14);
      doc.text(`Payment Method: ${payMethod}`, card2X, cardY + 28);
      doc.fillColor(payStatus === 'PAID' ? '#059669' : '#D97706').font('Helvetica-Bold').text(`Payment Status: ${payStatus}`, card2X, cardY + 42);
      doc.fillColor(mutedColor).font('Helvetica').text('Delivery: Express Home Delivery', card2X, cardY + 54);

      // 3. Products Table Section
      let y = 205;
      doc.rect(36, y, 523, 22).fill('#F8FAFC');
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold');
      doc.text('#', 44, y + 6);
      doc.text('ITEM DESCRIPTION', 68, y + 6);
      doc.text('UNIT PRICE', 320, y + 6, { width: 70, align: 'right' });
      doc.text('QTY', 415, y + 6, { width: 40, align: 'center' });
      doc.text('TOTAL (BDT)', 470, y + 6, { width: 80, align: 'right' });

      y += 24;

      // Products Table Rows
      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        const itemName = item.name || item.nameEn || item.product?.name || 'Medicine Item';
        const unitPrice = Number(item.effectiveUnitPrice ?? item.unitPrice ?? item.sellingPrice ?? item.price ?? 0);
        const qty = Number(item.quantity || 1);
        const itemTotal = Number(item.totalPrice ?? (unitPrice * qty));

        doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold').text(`${idx + 1}`, 44, y);
        doc.font('Helvetica-Bold').text(itemName, 68, y, { width: 240, height: 14 });
        doc.font('Helvetica').text(`TK ${unitPrice}`, 320, y, { width: 70, align: 'right' });
        doc.font('Helvetica-Bold').text(`${qty}`, 415, y, { width: 40, align: 'center' });
        doc.font('Helvetica-Bold').text(`TK ${itemTotal}`, 470, y, { width: 80, align: 'right' });

        y += 20;
        doc.moveTo(36, y - 4).lineTo(559, y - 4).strokeColor('#F1F5F9').lineWidth(0.8).stroke();
      });

      y += 16;

      // 4. Financial Summary Card
      const subtotal = Number(order.summary?.subtotal ?? order.subtotal ?? 0);
      const discount = Number(order.summary?.couponDiscount ?? order.couponDiscount ?? 0);
      const delivery = Number(order.summary?.deliveryCharge ?? order.deliveryCharge ?? 60);
      const grandTotal = Number(order.summary?.grandTotal ?? order.grandTotal ?? 0);

      const summaryX = 330;
      const summaryWidth = 229;

      doc.fillColor(mutedColor).fontSize(8.5).font('Helvetica').text('Subtotal:', summaryX, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(`TK ${subtotal}`, summaryX + 110, y, { width: 110, align: 'right' });

      if (discount > 0) {
        y += 16;
        doc.fillColor('#059669').font('Helvetica').text('Discount:', summaryX, y);
        doc.text(`-TK ${discount}`, summaryX + 110, y, { width: 110, align: 'right' });
      }

      y += 16;
      doc.fillColor(mutedColor).font('Helvetica').text('Delivery Charge:', summaryX, y);
      doc.fillColor(textColor).font('Helvetica-Bold').text(delivery === 0 ? 'FREE' : `TK ${delivery}`, summaryX + 110, y, { width: 110, align: 'right' });

      y += 20;
      doc.roundedRect(summaryX, y, summaryWidth, 28, 5).fill(primaryBlue);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('GRAND TOTAL:', summaryX + 12, y + 8);
      doc.fontSize(12).font('Helvetica-Bold').text(`TK ${grandTotal}`, summaryX + 100, y + 7, { width: 118, align: 'right' });

      // 5. Terms & Policies Section (Pushed down to VERY BOTTOM of page before footer at y = 635)
      y = 635;
      doc.moveTo(36, y).lineTo(559, y).strokeColor(borderColor).lineWidth(0.8).stroke();
      y += 12;

      doc.fillColor(primaryBlue).fontSize(8.5).font('Helvetica-Bold').text('INVOICE TERMS & POLICIES:', 36, y);
      y += 13;
      doc.fillColor(mutedColor).fontSize(7.5).font('Helvetica').text(`• Terms: ${termsText}`, 36, y, { width: 523 });
      y += 11;
      doc.text(`• Return/Refund Policy: ${refundText}`, 36, y, { width: 523 });
      y += 11;
      doc.text(`• Warranty Policy: ${warrantyText}`, 36, y, { width: 523 });

      // 6. Professional 3-Column Footer (Positioned at y = 715)
      y = 715;
      doc.moveTo(36, y).lineTo(559, y).strokeColor(borderColor).lineWidth(0.8).stroke();
      y += 12;

      doc.fillColor(primaryBlue).fontSize(8.5).font('Helvetica-Bold').text('100% AUTHENTICITY', 36, y);
      doc.fillColor(mutedColor).fontSize(7.5).font('Helvetica').text('Guaranteed 100% genuine DGDA certified medicines.', 36, y + 12, { width: 160 });

      doc.fillColor(primaryBlue).fontSize(8.5).font('Helvetica-Bold').text('CUSTOMER SUPPORT', 220, y);
      doc.fillColor(mutedColor).fontSize(7.5).font('Helvetica').text('Hotline: 16780\nEmail: support@medishop.com.bd', 220, y + 12, { width: 160 });

      doc.fillColor(primaryBlue).fontSize(8.5).font('Helvetica-Bold').text('IMPORTANT NOTICE', 400, y);
      doc.fillColor(mutedColor).fontSize(7.5).font('Helvetica').text('Computer-generated tax invoice. No physical signature required.', 400, y + 12, { width: 160 });

      // Bottom Tagline
      doc.fillColor(primaryBlue).fontSize(8.5).font('Helvetica-Bold').text('Thank you for choosing mediShop — Your Trusted Digital Pharmacy.', 36, y + 42, { align: 'center', width: 523 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
