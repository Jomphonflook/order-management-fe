import { HttpErrorResponse } from '@angular/common/http';

const API_MESSAGES: Record<string, string> = {
  'Invalid user id': 'รหัสผู้ใช้ไม่ถูกต้อง',
  'At least one update field is required': 'กรุณาระบุข้อมูลที่ต้องการแก้ไข',
  'Admin account not found': 'ไม่พบบัญชีผู้ดูแล',
  'Password must be at most 72 bytes': 'รหัสผ่านต้องมีขนาดไม่เกิน 72 ไบต์',
  'An account with this email already exists': 'มีบัญชีที่ใช้อีเมลนี้แล้ว',
  'Payment slip file not found': 'ไม่พบไฟล์สลิป',
  'Payment slips must be 5 MB or smaller': 'สลิปต้องมีขนาดไม่เกิน 5 MB',
  'Payment slip not found': 'ไม่พบสลิปการชำระเงิน',
  'Order not found': 'ไม่พบออเดอร์',
  'Provide at least one order update': 'กรุณาระบุข้อมูลออเดอร์ที่ต้องการแก้ไข',
  'Amount paid cannot exceed the order total': 'ยอดที่ชำระแล้วต้องไม่เกินยอดรวมออเดอร์',
  'An unpaid order cannot have an amount paid': 'ออเดอร์ที่ยังไม่ชำระต้องมียอดชำระเป็น 0',
  'A paid order must have an amount paid equal to its total':
    'ออเดอร์ที่ชำระแล้วต้องมียอดชำระเท่ากับยอดรวม',
  'Date must be a valid calendar date': 'วันที่ไม่ถูกต้อง',
  'Discount cannot exceed the order subtotal': 'ส่วนลดต้องไม่เกินยอดรวมสินค้า',
  'Invalid order id': 'รหัสออเดอร์ไม่ถูกต้อง',
  'Product not found': 'ไม่พบสินค้า',
  'Provide at least one product update': 'กรุณาระบุข้อมูลสินค้าที่ต้องการแก้ไข',
  'Product image not found': 'ไม่พบรูปสินค้า',
  'Invalid product id': 'รหัสสินค้าไม่ถูกต้อง',
  'A product with this SKU already exists': 'มีสินค้าใช้ SKU นี้แล้ว',
  'Payment slip file is required': 'กรุณาเลือกไฟล์สลิป',
  'Images must be JPEG, PNG, or WebP files': 'รูปภาพต้องเป็นไฟล์ JPEG, PNG หรือ WebP',
  'Each image must be 5 MB or smaller': 'รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 5 MB',
  'Images must be valid JPEG, PNG, or WebP files':
    'รูปภาพต้องเป็นไฟล์ JPEG, PNG หรือ WebP ที่ถูกต้อง',
  'Payment slips must be valid JPEG, PNG, or WebP images':
    'สลิปต้องเป็นไฟล์ภาพ JPEG, PNG หรือ WebP ที่ถูกต้อง',
  'Invalid email or password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Invalid or expired authentication': 'การเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  'Invalid authentication': 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง',
  'Authentication required': 'กรุณาเข้าสู่ระบบ',
  'The start date must be on or before the end date': 'วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด',
  'isActive must be true or false': 'สถานะสินค้าต้องเป็นเปิดใช้งานหรือปิดใช้งาน',
};

export function thaiErrorMessage(error: HttpErrorResponse, fallback: string): string {
  if (error.status === 0) {
    return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
  }
  const message = error.error?.message;
  const messages = Array.isArray(message) ? message : typeof message === 'string' ? [message] : [];
  if (messages.length === 0) return fallback;
  return messages
    .map((item) => {
      if (typeof item !== 'string') return fallback;
      if (API_MESSAGES[item]) return API_MESSAGES[item];
      const productImages = item.match(/^A product can have at most (\d+) images$/);
      if (productImages) return `สินค้าแต่ละรายการเพิ่มรูปได้สูงสุด ${productImages[1]} รูป`;
      const unavailableProduct = item.match(/^Product (.+) was not found or is inactive$/);
      if (unavailableProduct)
        return `ไม่พบสินค้ารหัส ${unavailableProduct[1]} หรือสินค้าถูกปิดใช้งาน`;
      if (item.includes('must be') || item.includes('should not') || item.includes('should be')) {
        return 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง';
      }
      return fallback;
    })
    .join(' ');
}
