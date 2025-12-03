/**
 * CheckoutPage Component
 * Trang thanh toán - tạo đơn hàng từ giỏ hàng
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Radio,
  Space,
  Typography,
  Divider,
  Spin,
  Modal,
  Checkbox,
  Tag
} from 'antd';
import {
  ShoppingCartOutlined,
  EnvironmentOutlined,
  TruckOutlined,
  CreditCardOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../../api/userService';
import type { Cart } from '../../../api/cartService.types';
import addressService from '../../../api/addressService';
import type { Address } from '../../../types';
import orderService from '../../../api/orderService';
import paymentService from '../../../api/paymentService';
import voucherService from '../../../api/voucherService';
import { fetchCart } from '../../../features/cart/cartSlice';
import { PageWrapper, useToast } from '../../../components';
import './Checkout.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CheckoutFormData {
  shippingAddressId?: string;
  shippingAddress?: Address;
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card' | 'momo' | 'zalopay' | 'vnpay';
  shippingMethod: 'standard' | 'express' | 'same_day';
  couponCode?: string;
  note?: string;
  isGift?: boolean;
  giftMessage?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm] = Form.useForm();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [savedVouchers, setSavedVouchers] = useState<any[]>([]);
  const [displayShippingFee, setDisplayShippingFee] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string> | null>(null);

  useEffect(() => {
    loadData();
    loadSavedVouchers();
  }, []);

  const loadSavedVouchers = async () => {
    try {
      const vouchers = await voucherService.getSavedVouchers();
      setSavedVouchers(vouchers);
    } catch (error) {
      console.error('Failed to load saved vouchers:', error);
    }
  };

  // Hàm helper để filter cart theo selectedItems
  const filterCartBySelectedItems = (cartData: Cart | null): Cart | null => {
    if (!cartData || !selectedItems || selectedItems.size === 0) {
      return cartData;
    }

    const filteredItems = cartData.items.filter((item: any) => selectedItems.has(item._id));
    
    if (filteredItems.length === 0) {
      return {
        ...cartData,
        items: [],
        totalAmount: 0,
        totalItems: 0,
        isEmpty: true,
        finalAmount: 0
      };
    }

    // Tính lại tổng tiền dựa trên các item đã chọn
    const subtotal = filteredItems.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const totalItems = filteredItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    // Tính lại discountAmount theo tỷ lệ nếu có voucher
    let discountAmount = 0;
    if (cartData.discountAmount && cartData.discountAmount > 0 && cartData.totalAmount > 0) {
      // Tính tỷ lệ: subtotal đã chọn / subtotal toàn bộ cart
      const ratio = subtotal / cartData.totalAmount;
      discountAmount = Math.round(cartData.discountAmount * ratio);
    }
    
    // Tính lại finalAmount dựa trên subtotal đã filter
    const finalAmount = subtotal + (cartData.shippingFee || 0) - discountAmount;
    
    return {
      ...cartData,
      items: filteredItems,
      totalAmount: subtotal,
      totalItems: totalItems,
      isEmpty: false,
      discountAmount: discountAmount,
      finalAmount: finalAmount
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [cartData, addressesData] = await Promise.all([
        userService.getCart(),
        addressService.getAddresses()
      ]);

      console.log('[Checkout] Loaded cart data:', {
        totalAmount: cartData?.totalAmount,
        totalItems: cartData?.totalItems,
        isEmpty: cartData?.isEmpty,
        items: cartData?.items?.length,
        cart: cartData
      });
      
      // Kiểm tra xem có selectedItems từ Cart page không
      const selectedItemsStr = localStorage.getItem('selectedCartItems');
      if (selectedItemsStr) {
        try {
          const parsedItems = JSON.parse(selectedItemsStr) as string[];
          const selectedItemsSet = new Set<string>(parsedItems);
          setSelectedItems(selectedItemsSet);
          
          // Filter cart items chỉ lấy các item đã chọn
          if (cartData && cartData.items) {
            const filteredItems = cartData.items.filter((item: any) => selectedItemsSet.has(item._id));
            
            // Tính lại tổng tiền dựa trên các item đã chọn
            const subtotal = filteredItems.reduce((sum: number, item: any) => {
              return sum + (item.price * item.quantity);
            }, 0);
            
            const totalItems = filteredItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
            
            // Tính lại discountAmount theo tỷ lệ nếu có voucher
            let discountAmount = 0;
            if (cartData.discountAmount && cartData.discountAmount > 0 && cartData.totalAmount > 0) {
              // Tính tỷ lệ: subtotal đã chọn / subtotal toàn bộ cart
              const ratio = subtotal / cartData.totalAmount;
              discountAmount = Math.round(cartData.discountAmount * ratio);
            }
            
            // Tính lại finalAmount dựa trên subtotal đã filter
            const finalAmount = subtotal + (cartData.shippingFee || 0) - discountAmount;
            
            // Tạo cart mới với các item đã chọn
            const filteredCart = {
              ...cartData,
              items: filteredItems,
              totalAmount: subtotal,
              totalItems: totalItems,
              isEmpty: filteredItems.length === 0,
              discountAmount: discountAmount,
              finalAmount: finalAmount
            };
            
            setCart(filteredCart);
            
            // KHÔNG xóa localStorage ở đây - giữ lại cho đến khi order được tạo thành công
            // localStorage.removeItem('selectedCartItems');
            
            console.log('[Checkout] Filtered cart with selected items:', {
              originalItems: cartData.items.length,
              selectedItems: filteredItems.length,
              selectedItemsSet: Array.from(selectedItemsSet),
              filteredCart
            });
          } else {
            setCart(cartData);
          }
        } catch (error) {
          console.error('[Checkout] Error parsing selectedItems:', error);
          setCart(cartData);
        }
      } else {
        setCart(cartData);
      }
      setAddresses(addressesData);

      // Set default address
      const defaultAddress = addressesData.find(addr => addr.isDefault) || addressesData[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id || null);
        form.setFieldsValue({
          shippingAddressId: defaultAddress._id,
          shippingMethod: 'standard',
          paymentMethod: 'cod'
        });
      }

      // Đồng bộ displayShippingFee với cart.shippingFee từ backend
      // Nếu có voucher free shipping, cart.shippingFee sẽ là 0
      // Nếu không có voucher, set mặc định theo shipping method
      if (cartData?.shippingFee !== null && cartData?.shippingFee !== undefined) {
        setDisplayShippingFee(cartData.shippingFee);
      } else {
        // Chưa có shipping fee, set mặc định theo shipping method
        const method = form.getFieldValue('shippingMethod') || 'standard';
        const shippingFees: Record<string, number> = {
          'standard': 30000,
          'express': 50000,
          'same_day': 80000
        };
        const defaultFee = shippingFees[method] || 30000;
        setDisplayShippingFee(defaultFee);
        
        // Cập nhật phí vận chuyển mặc định nếu chưa có (trừ khi có voucher free shipping)
        if (!cartData?.couponCode) {
          try {
            await userService.updateShippingFee(defaultFee);
            const updatedCart = await userService.getCart();
            const filteredCart = filterCartBySelectedItems(updatedCart);
            setCart(filteredCart);
            setDisplayShippingFee(updatedCart.shippingFee || defaultFee);
          } catch (error) {
            console.error('[Checkout] Error setting default shipping fee:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading checkout data:', error);
      toast.error('Không thể tải dữ liệu thanh toán');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find(addr => addr._id === addressId);
    if (address) {
      const method = form.getFieldValue('shippingMethod') || 'standard';
      // Phí vận chuyển theo phương thức đã chọn
      const shippingFees: Record<string, number> = {
        'standard': 30000,
        'express': 50000,
        'same_day': 80000
      };
      const shippingFee = shippingFees[method] || 30000;
      
      // Cập nhật phí hiển thị
      setDisplayShippingFee(shippingFee);
      
      // Cập nhật phí vận chuyển trong cart
      if (cart) {
        userService.updateShippingFee(shippingFee).then(() => {
          userService.getCart().then(updatedCart => {
            const filteredCart = filterCartBySelectedItems(updatedCart);
            setCart(filteredCart);
          });
        }).catch(error => {
          console.error('[Checkout] Error updating shipping fee:', error);
        });
      }
    }
  };

  const handleShippingMethodChange = async (method: string) => {
    // Cập nhật giá trị form
    form.setFieldsValue({ shippingMethod: method });
    
    // Phí vận chuyển theo phương thức (dùng giá đã hiển thị)
    const shippingFees: Record<string, number> = {
      'standard': 30000,
      'express': 50000,
      'same_day': 80000
    };
    const shippingFee = shippingFees[method] || 30000;
    
    // Cập nhật phí hiển thị ngay lập tức
    setDisplayShippingFee(shippingFee);
    
    // Cập nhật phí vận chuyển trong cart
    if (cart) {
      try {
        await userService.updateShippingFee(shippingFee);
        const updatedCart = await userService.getCart();
        const filteredCart = filterCartBySelectedItems(updatedCart);
        setCart(filteredCart);
      } catch (error) {
        console.error('[Checkout] Error updating shipping fee:', error);
        toast.error('Không thể cập nhật phí vận chuyển');
      }
    }
  };

  const handleApplyCoupon = async (code?: string) => {
    const codeToApply = code || couponCode;
    
    if (!codeToApply.trim()) {
      toast.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    if (!cart || cart.totalAmount === 0) {
      toast.warning('Giỏ hàng trống');
      return;
    }

    try {
      setApplyingCoupon(true);
      
      // Gọi trực tiếp applyCoupon - backend sẽ validate và tính discount
      const result = await userService.applyCoupon(codeToApply.trim().toUpperCase());
      
      // Reload cart để cập nhật giá và shipping fee
      const updatedCart = await userService.getCart();
      if (updatedCart) {
        const filteredCart = filterCartBySelectedItems(updatedCart);
        setCart(filteredCart);
        
        // Đồng bộ displayShippingFee với cart.shippingFee (quan trọng khi có free shipping voucher)
        if (updatedCart.shippingFee !== null && updatedCart.shippingFee !== undefined) {
          setDisplayShippingFee(updatedCart.shippingFee);
        }
      }
      
      // Reload cart trong Redux để đồng bộ
      await dispatch(fetchCart() as any);
      
      // Hiển thị thông báo với thông tin từ backend (SAU khi reload cart để không bị mất)
      let discountInfo = '';
      if (result.voucher && updatedCart) {
        if (result.discountAmount === 0 && updatedCart.shippingFee === 0) {
          discountInfo = 'Miễn phí vận chuyển';
        } else if (result.discountAmount > 0) {
          discountInfo = formatPrice(result.discountAmount);
        }
      }
      
      toast.success(result.message || `Áp dụng mã giảm giá thành công! ${discountInfo}`);
      setCouponCode('');
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      const errorMessage = error.response?.data?.message || 'Không thể áp dụng mã giảm giá';
        toast.error(errorMessage);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await userService.removeCoupon();
      
      // Reload cart để cập nhật giá
      const updatedCart = await userService.getCart();
      const filteredCart = filterCartBySelectedItems(updatedCart);
      setCart(filteredCart);
      
      // Đồng bộ displayShippingFee với cart.shippingFee sau khi remove voucher
      // Nếu đã remove voucher free shipping, cần restore shipping fee theo method
      if (updatedCart.shippingFee !== null && updatedCart.shippingFee !== undefined) {
        setDisplayShippingFee(updatedCart.shippingFee);
      } else {
        // Nếu shippingFee = 0 sau khi remove, restore theo shipping method
        const method = form.getFieldValue('shippingMethod') || 'standard';
        const shippingFees: Record<string, number> = {
          'standard': 30000,
          'express': 50000,
          'same_day': 80000
        };
        const restoreFee = shippingFees[method] || 30000;
        setDisplayShippingFee(restoreFee);
        
        // Cập nhật lại shipping fee trong cart
        try {
          await userService.updateShippingFee(restoreFee);
          const finalCart = await userService.getCart();
          const filteredFinalCart = filterCartBySelectedItems(finalCart);
          setCart(filteredFinalCart);
          setDisplayShippingFee(finalCart.shippingFee || restoreFee);
        } catch (error) {
          console.error('[Checkout] Error restoring shipping fee:', error);
        }
      }
      
      // Reload cart trong Redux để đồng bộ
      await dispatch(fetchCart() as any);
      
      // Hiển thị toast SAU khi reload cart để không bị mất
      toast.success('Đã xóa mã giảm giá');
    } catch (error) {
      console.error('Error removing coupon:', error);
      toast.error('Không thể xóa mã giảm giá');
    }
  };

  const handleCreateAddress = async (values: Address) => {
    try {
      const newAddress = await addressService.createAddress(values);
      setAddresses([...addresses, newAddress]);
      setSelectedAddressId(newAddress._id || null);
      form.setFieldsValue({ shippingAddressId: newAddress._id });
      setShowAddressModal(false);
      addressForm.resetFields();
      toast.success('Đã thêm địa chỉ mới');
    } catch (error: any) {
      console.error('Error creating address:', error);
      toast.error(error.response?.data?.message || 'Không thể tạo địa chỉ');
    }
  };

  const handleSubmit = async (values: CheckoutFormData) => {
    if (!cart || cart.isEmpty) {
      toast.warning('Giỏ hàng trống');
      return;
    }

    if (!selectedAddressId) {
      toast.warning('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    try {
      setSubmitting(true);
      const selectedAddress = addresses.find(addr => addr._id === selectedAddressId);

      if (!selectedAddress) {
        toast.error('Địa chỉ không hợp lệ');
        return;
      }

      // Lấy danh sách item IDs từ selectedItems state (không phải từ cart.items)
      // Nếu selectedItems state không có, lấy từ localStorage
      let selectedItemIds: string[] = [];
      
      if (selectedItems && selectedItems.size > 0) {
        selectedItemIds = Array.from(selectedItems);
        console.log('[Checkout] Using selectedItems from state:', selectedItemIds);
      } else {
        // Fallback: lấy từ localStorage nếu state bị mất
        const selectedItemsStr = localStorage.getItem('selectedCartItems');
        if (selectedItemsStr) {
          try {
            selectedItemIds = JSON.parse(selectedItemsStr);
            console.log('[Checkout] Using selectedItems from localStorage:', selectedItemIds);
          } catch (error) {
            console.error('[Checkout] Error parsing selectedItems from localStorage:', error);
          }
        }
      }
      
      // Nếu vẫn không có selectedItemIds, lấy từ cart.items (fallback cuối cùng)
      if (selectedItemIds.length === 0) {
        selectedItemIds = cart.items.map((item: any) => item._id);
        console.warn('[Checkout] No selectedItems found, using all cart items:', selectedItemIds);
      }
      
      console.log('[Checkout] Creating order with selected items:', {
        selectedItemIds,
        selectedItemsCount: selectedItemIds.length,
        cartItemsCount: cart.items.length,
        cartTotalAmount: cart.totalAmount,
        selectedItemsState: selectedItems ? Array.from(selectedItems) : null
      });
      
      // Lấy flash sale reservation IDs từ localStorage
      const flashSaleReservations = JSON.parse(localStorage.getItem('flashSaleReservations') || '[]');
      console.log(`[Checkout] Flash sale reservations from localStorage:`, flashSaleReservations);
      console.log(`[Checkout] Selected item IDs:`, selectedItemIds);
      console.log(`[Checkout] Cart items:`, cart.items.map((item: any) => ({
        _id: item._id,
        productId: typeof item.product === 'object' ? item.product._id : item.product,
        product: typeof item.product === 'object' ? item.product.name : 'N/A'
      })));
      
      const flashSaleReservationIds = flashSaleReservations
        .filter((r: any) => {
          // Chỉ lấy reservation cho các sản phẩm trong cart items đã chọn
          if (!selectedItemIds || selectedItemIds.length === 0) {
            console.log(`[Checkout] No selectedItemIds, including all reservations`);
            return true;
          }
          
          // Convert productId về Number để so sánh đúng
          const reservationProductId = typeof r.productId === 'number' ? r.productId : Number(r.productId);
          
          // Kiểm tra xem productId có trong cart items không
          const matches = cart.items.some((item: any) => {
            const itemProductId = typeof item.product === 'object' 
              ? (typeof item.product._id === 'number' ? item.product._id : Number(item.product._id))
              : (typeof item.product === 'number' ? item.product : Number(item.product));
            const productIdMatch = itemProductId === reservationProductId;
            const itemIdMatch = selectedItemIds.includes(String(item._id));
            const result = productIdMatch && itemIdMatch;
            
            console.log(`[Checkout] Checking reservation for productId ${r.productId} (${typeof r.productId}):`, {
              reservationProductId,
              itemProductId,
              productIdMatch,
              itemId: item._id,
              itemIdMatch,
              result
            });
            
            return result;
          });
          
          if (!matches) {
            console.log(`[Checkout] Reservation ${r.reservationId} for productId ${r.productId} does not match any selected cart item`);
          }
          
          return matches;
        })
        .map((r: any) => r.reservationId)
        .filter((id: string) => id);
      
      console.log(`[Checkout] Filtered flash sale reservation IDs:`, flashSaleReservationIds);
      console.log(`[Checkout] Total flash sale reservations:`, flashSaleReservations.length);
      console.log(`[Checkout] Selected item IDs:`, selectedItemIds);

      // Tính toán total amount từ cart
      const subtotal = cart.totalAmount || 0;
      const shipping = currentShippingFee || 0;
      const discount = cart.discountAmount || 0;
      const totalAmount = subtotal + shipping - discount;

      // Chuẩn bị cart data để gửi lên backend (sẽ dùng để tạo order sau khi thanh toán thành công)
      const cartData = {
        selectedItemIds: selectedItemIds,
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          email: selectedAddress.email,
          address: selectedAddress.address,
          ward: selectedAddress.ward,
          district: selectedAddress.district,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
          note: selectedAddress.note
        },
        paymentMethod: values.paymentMethod,
        shippingMethod: values.shippingMethod || 'standard',
        notes: values.note,
        isGift: values.isGift,
        giftMessage: values.giftMessage,
        flashSaleReservationIds: flashSaleReservationIds.length > 0 ? flashSaleReservationIds : undefined,
        totalAmount: totalAmount,
        subtotal: subtotal,
        shippingFee: shipping,
        discountAmount: discount,
        couponCode: cart.couponCode
      };

      // Nếu là thanh toán MoMo hoặc VNPay, tạo payment request trước (KHÔNG tạo order)
      if (values.paymentMethod === 'momo' || values.paymentMethod === 'vnpay') {
        // Lưu cart data vào localStorage để dùng sau khi thanh toán thành công
        // Thêm tempOrderNumber vào cartData để dùng sau
        const cartDataWithOrderNumber = {
          ...cartData,
          tempOrderNumber: null // Sẽ được set sau khi có payment result
        };
        localStorage.setItem('pendingOrderData', JSON.stringify(cartDataWithOrderNumber));
        
        // Xóa flash sale reservations đã sử dụng khỏi localStorage (tạm thời, sẽ restore nếu thanh toán thất bại)
        if (flashSaleReservationIds.length > 0) {
          const remainingReservations = flashSaleReservations.filter(
            (r: any) => !flashSaleReservationIds.includes(r.reservationId)
          );
          localStorage.setItem('flashSaleReservations', JSON.stringify(remainingReservations));
        }

        // Tạo payment request với cart data
        if (values.paymentMethod === 'momo') {
          try {
            const paymentResult = await paymentService.createMomoPayment({
              cartData: cartData
            });

            if (paymentResult.success && paymentResult.data.payUrl) {
              // Redirect đến MoMo payment page
              window.location.href = paymentResult.data.payUrl;
              setSubmitting(false);
              return;
            } else {
              throw new Error('Không thể tạo payment link thanh toán MoMo');
            }
          } catch (error: any) {
            console.error('MoMo Payment Error:', error);
            
            // Restore flash sale reservations nếu có lỗi
            if (flashSaleReservationIds.length > 0) {
              localStorage.setItem('flashSaleReservations', JSON.stringify(flashSaleReservations));
            }
            
            // Xóa pending order data
            localStorage.removeItem('pendingOrderData');
            
            let errorMessage = 'Không thể tạo yêu cầu thanh toán MoMo';
            
            if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setSubmitting(false);
            return;
          }
        } else if (values.paymentMethod === 'vnpay') {
          try {
            const paymentResult = await paymentService.createVNPayPayment({
              cartData: cartData
            });

            if (paymentResult.success && paymentResult.data.paymentUrl) {
              // Lưu orderNumber vào cartData trong localStorage
              const orderNumber = paymentResult.data.orderNumber;
              const pendingOrderDataStr = localStorage.getItem('pendingOrderData');
              if (pendingOrderDataStr) {
                try {
                  const pendingOrderData = JSON.parse(pendingOrderDataStr);
                  pendingOrderData.tempOrderNumber = orderNumber;
                  localStorage.setItem('pendingOrderData', JSON.stringify(pendingOrderData));
                  console.log('[Frontend] Saved tempOrderNumber to localStorage:', orderNumber);
                } catch (error) {
                  console.error('[Frontend] Error updating pendingOrderData:', error);
                }
              }
              
              // Redirect đến VNPay payment page
              // Log URL để debug
              const paymentUrl = paymentResult.data.paymentUrl;
              console.log('[Frontend] VNPay Payment URL:', paymentUrl);
              console.log('[Frontend] VNPay Payment URL length:', paymentUrl.length);
              
              // Kiểm tra xem URL có khoảng trắng không
              const hasSpace = paymentUrl.includes(' ');
              console.log('[Frontend] URL has space:', hasSpace);
              if (hasSpace) {
                console.log('[Frontend] URL spaces at positions:', 
                  [...paymentUrl].map((char, idx) => char === ' ' ? idx : null).filter(x => x !== null)
                );
              }
              
              // Browser sẽ tự động encode URL khi redirect
              // Nhưng VNPay có thể yêu cầu URL không được encode
              // Thử dùng window.location.replace thay vì href
              window.location.replace(paymentUrl);
              setSubmitting(false);
              return;
            } else {
              throw new Error('Không thể tạo payment link thanh toán VNPay');
            }
          } catch (error: any) {
            console.error('VNPay Payment Error:', error);
            
            // Restore flash sale reservations nếu có lỗi
            if (flashSaleReservationIds.length > 0) {
              localStorage.setItem('flashSaleReservations', JSON.stringify(flashSaleReservations));
            }
            
            // Xóa pending order data
            localStorage.removeItem('pendingOrderData');
            
            let errorMessage = 'Không thể tạo yêu cầu thanh toán VNPay';
            
            if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setSubmitting(false);
            return;
          }
        }
      }

      // Nếu là COD, tạo order ngay lập tức
      console.log(`[Checkout] Creating order with flashSaleReservationIds:`, flashSaleReservationIds);
      const order = await orderService.createFromCart({
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          email: selectedAddress.email,
          address: selectedAddress.address,
          ward: selectedAddress.ward,
          district: selectedAddress.district,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
          note: selectedAddress.note
        },
        paymentMethod: values.paymentMethod,
        shippingMethod: values.shippingMethod || 'standard',
        notes: values.note,
        isGift: values.isGift,
        giftMessage: values.giftMessage,
        selectedItemIds: selectedItemIds,
        // Luôn gửi flashSaleReservationIds (có thể là empty array)
        flashSaleReservationIds: flashSaleReservationIds.length > 0 ? flashSaleReservationIds : []
      });

      // Xóa flash sale reservations đã sử dụng khỏi localStorage
      if (flashSaleReservationIds.length > 0) {
        const remainingReservations = flashSaleReservations.filter(
          (r: any) => !flashSaleReservationIds.includes(r.reservationId)
        );
        localStorage.setItem('flashSaleReservations', JSON.stringify(remainingReservations));
      }

      // Cart đã được xóa các items đã chọn ở backend, chỉ cần reload cart state
      // Cập nhật Redux cart state để icon giỏ hàng được cập nhật
      await dispatch(fetchCart() as any);

      // Xóa selectedItems từ localStorage sau khi order được tạo thành công
      localStorage.removeItem('selectedCartItems');
      setSelectedItems(null);

      toast.success('Đặt hàng thành công!');
      navigate(`/orders/${order._id}`, {
        state: { order }
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Không thể tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };


  const currentShippingFee = displayShippingFee !== null ? displayShippingFee : (cart?.shippingFee || 0);
  
  // Tính finalAmount với useMemo để đảm bảo tính lại khi cart hoặc shippingFee thay đổi
  const finalAmount = useMemo(() => {
    if (!cart) return 0;
    const subtotal = cart.totalAmount || 0;
    const shipping = currentShippingFee || 0;
    const discount = cart.discountAmount || 0;
    const final = subtotal + shipping - discount;
    
    console.log('[Checkout] Calculating finalAmount:', {
      subtotal,
      shipping,
      discount,
      final,
      couponCode: cart.couponCode
    });
    
    return final;
  }, [cart, currentShippingFee]);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="checkout-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!cart || cart.isEmpty) {
    return (
      <PageWrapper>
        <div className="checkout-page">
          <div className="container">
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <ShoppingCartOutlined style={{ fontSize: 64, color: '#ccc' }} />
                <Title level={4} style={{ marginTop: 16 }}>
                  Giỏ hàng trống
                </Title>
                <Button type="primary" onClick={() => navigate('/cart')}>
                  Quay lại giỏ hàng
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="checkout-page">
        <div className="container">
          <Title level={2} style={{ marginBottom: 24 }}>
            Thanh toán
          </Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              shippingMethod: 'standard',
              paymentMethod: 'cod'
            }}
          >
            <Row gutter={[24, 24]}>
              {/* Left Column - Form */}
              <Col xs={24} lg={16}>
                {/* Cart Items */}
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <span>Sản phẩm trong đơn hàng ({cart.totalItems} sản phẩm)</span>
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  {cart.items && cart.items.length > 0 ? (
                    <div>
                      {cart.items.map((item: any) => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            padding: '16px 0',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          <div
                            style={{
                              width: '80px',
                              height: '80px',
                              marginRight: '16px',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={item.product?.thumbnail || item.product?.imageUrl || '/placeholder-product.png'}
                              alt={item.product?.name || 'Sản phẩm'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '4px'
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                              {item.product?.name || item.productName || 'Sản phẩm'}
                            </Text>
                            {item.variant && (
                              <div style={{ marginBottom: '8px' }}>
                                {item.variant.storage && (
                                  <Tag style={{ marginRight: '8px' }}>Dung lượng: {item.variant.storage}</Tag>
                                )}
                                {item.variant.color && (
                                  <Tag style={{ marginRight: '8px' }}>Màu: {item.variant.color}</Tag>
                                )}
                                {item.variant.ram && (
                                  <Tag>RAM: {item.variant.ram}</Tag>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text type="secondary">Số lượng: {item.quantity}</Text>
                              <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                                {formatPrice(item.price * item.quantity)}
                              </Text>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Không có sản phẩm trong giỏ hàng</Text>
                  )}
                </Card>

                {/* Shipping Address */}
                <Card
                  title={
                    <Space>
                      <EnvironmentOutlined />
                      <span>Địa chỉ giao hàng</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() => setShowAddressModal(true)}
                    >
                      Thêm địa chỉ mới
                    </Button>
                  }
                >
                  {addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Text type="secondary">Bạn chưa có địa chỉ nào</Text>
                      <br />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setShowAddressModal(true)}
                        style={{ marginTop: 16 }}
                      >
                        Thêm địa chỉ mới
                      </Button>
                    </div>
                  ) : (
                    <Form.Item name="shippingAddressId" rules={[{ required: true }]}>
                      <Radio.Group
                        value={selectedAddressId || undefined}
                        onChange={(e) => {
                          handleAddressChange(e.target.value);
                          form.setFieldsValue({ shippingAddressId: e.target.value });
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {addresses.map((address) => (
                            <Radio key={address._id} value={address._id}>
                              <div className="address-card">
                                <div className="address-header">
                                  <Text strong>{address.fullName}</Text>
                                  {address.isDefault && (
                                    <Tag color="blue">Mặc định</Tag>
                                  )}
                                </div>
                                <Text type="secondary">
                                  {address.phone}
                                </Text>
                                <br />
                                <Text type="secondary">
                                  {address.address}, {address.ward}, {address.district}, {address.province}
                                </Text>
                              </div>
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  )}
                </Card>

                {/* Shipping Method */}
                <Card
                  title={
                    <Space>
                      <TruckOutlined />
                      <span>Phương thức vận chuyển</span>
                    </Space>
                  }
                  style={{ marginTop: 16 }}
                >
                  <Form.Item name="shippingMethod" rules={[{ required: true }]}>
                    <Radio.Group onChange={(e) => handleShippingMethodChange(e.target.value)}>
                      <Space direction="vertical">
                        <Radio value="standard">
                          <div>
                            <Text strong>Giao hàng tiêu chuẩn</Text>
                            <br />
                            <Text type="secondary">3-5 ngày làm việc - {formatPrice(30000)}</Text>
                          </div>
                        </Radio>
                        <Radio value="express">
                          <div>
                            <Text strong>Giao hàng nhanh</Text>
                            <br />
                            <Text type="secondary">1-2 ngày làm việc - {formatPrice(50000)}</Text>
                          </div>
                        </Radio>
                        <Radio value="same_day">
                          <div>
                            <Text strong>Giao trong ngày</Text>
                            <br />
                            <Text type="secondary">Trong ngày - {formatPrice(80000)}</Text>
                          </div>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>

                {/* Payment Method */}
                <Card
                  title={
                    <Space>
                      <CreditCardOutlined />
                      <span>Phương thức thanh toán</span>
                    </Space>
                  }
                  style={{ marginTop: 16 }}
                >
                  <Form.Item name="paymentMethod" rules={[{ required: true }]}>
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="cod">
                          <Text strong>Thanh toán khi nhận hàng (COD)</Text>
                        </Radio>

                        <Radio value="momo">
                          <Text strong>Ví điện tử MoMo</Text>
                        </Radio>
                        <Radio value="vnpay">
                          <Text strong>VNPay (QR Code / Thẻ ATM)</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>

                {/* Coupon Code */}
                <Card title="Mã giảm giá" style={{ marginTop: 16 }}>
                  {cart.couponCode ? (
                    <Space>
                      <Text>Mã đã áp dụng: <Text strong>{cart.couponCode}</Text></Text>
                      <Text type="success">-{formatPrice(cart.discountAmount || 0)}</Text>
                      <Button type="link" danger onClick={handleRemoveCoupon}>
                        Xóa
                      </Button>
                    </Space>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {/* Danh sách voucher đã lưu */}
                      {savedVouchers.length > 0 && (
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Voucher đã lưu:
                          </Text>
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {savedVouchers.map((voucher) => {
                              const formatDiscount = () => {
                                if (voucher.type === 'percentage') {
                                  return `Giảm ${voucher.value}%`;
                                } else if (voucher.type === 'fixed_amount') {
                                  return `Giảm ${formatPrice(voucher.value)}`;
                                } else {
                                  return 'Miễn phí vận chuyển';
                                }
                              };

                              const isVoucherValid = () => {
                                const now = new Date();
                                const validFrom = new Date(voucher.validFrom);
                                const validTo = new Date(voucher.validTo);
                                return now >= validFrom && now <= validTo && voucher.isActive;
                              };

                              return (
                                <Card
                                  key={voucher._id}
                                  size="small"
                                  style={{
                                    border: isVoucherValid() ? '1px solid #52c41a' : '1px solid #d9d9d9',
                                    cursor: isVoucherValid() ? 'pointer' : 'not-allowed',
                                    opacity: isVoucherValid() ? 1 : 0.6,
                                  }}
                                  onClick={() => {
                                    if (isVoucherValid()) {
                                      handleApplyCoupon(voucher.code);
                                    }
                                  }}
                                >
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <div>
                                      <Text strong style={{ fontFamily: 'monospace' }}>
                                        {voucher.code}
                                      </Text>
                                      <div>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          {voucher.name}
                                        </Text>
                                      </div>
                                      <div>
                                        <Text strong style={{ color: '#52c41a' }}>
                                          {formatDiscount()}
                                        </Text>
                                      </div>
                                    </div>
                                    {isVoucherValid() ? (
                                      <Button
                                        type="primary"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplyCoupon(voucher.code);
                                        }}
                                        loading={applyingCoupon && couponCode === voucher.code}
                                      >
                                        Áp dụng
                                      </Button>
                                    ) : (
                                      <Tag color="default">Không khả dụng</Tag>
                                    )}
                                  </Space>
                                </Card>
                              );
                            })}
                          </Space>
                        </div>
                      )}

                      {/* Nhập mã thủ công */}
                      <Divider>Hoặc nhập mã</Divider>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="Nhập mã giảm giá"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onPressEnter={() => handleApplyCoupon()}
                        />
                        <Button
                          type="primary"
                          onClick={() => handleApplyCoupon()}
                          loading={applyingCoupon}
                        >
                          Áp dụng
                        </Button>
                      </Space.Compact>
                    </Space>
                  )}
                </Card>

                {/* Additional Notes */}
                <Card title="Ghi chú" style={{ marginTop: 16 }}>
                  <Form.Item name="note">
                    <TextArea
                      rows={3}
                      placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                    />
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.isGift !== currentValues.isGift
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('isGift') ? (
                        <Form.Item name="giftMessage">
                          <TextArea
                            rows={2}
                            placeholder="Lời nhắn gửi kèm (tùy chọn)"
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </Card>
              </Col>

              {/* Right Column - Order Summary */}
              <Col xs={24} lg={8}>
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <span>Tóm tắt đơn hàng</span>
                    </Space>
                  }
                  className="order-summary"
                >
                  <div className="summary-section">
                    <div className="summary-item">
                      <Text>Tạm tính:</Text>
                      <Text>{formatPrice(cart.totalAmount)}</Text>
                    </div>
                    <div className="summary-item">
                      <Text>Phí vận chuyển:</Text>
                      <Text>{formatPrice(displayShippingFee !== null ? displayShippingFee : (cart?.shippingFee || 0))}</Text>
                    </div>
                    {cart.discountAmount && cart.discountAmount > 0 && (
                      <div className="summary-item">
                        <Text>Giảm giá:</Text>
                        <Text type="success">-{formatPrice(cart.discountAmount)}</Text>
                      </div>
                    )}
                    <Divider />
                    <div className="summary-item total">
                      <Text strong>Tổng cộng:</Text>
                      <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                        {formatPrice(finalAmount)}
                      </Text>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    htmlType="submit"
                    loading={submitting}
                    icon={<CheckOutlined />}
                    style={{ marginTop: 16 }}
                  >
                    Đặt hàng
                  </Button>

                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 16 }}>
                    Bằng cách đặt hàng, bạn đồng ý với các điều khoản và điều kiện của chúng tôi
                  </Text>
                </Card>
              </Col>
            </Row>
          </Form>
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        title="Thêm địa chỉ mới"
        open={showAddressModal}
        onCancel={() => {
          setShowAddressModal(false);
          addressForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={handleCreateAddress}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              { required: true, message: 'Vui lòng nhập họ và tên' },
              { min: 2, message: 'Họ và tên phải có ít nhất 2 ký tự' },
              { max: 100, message: 'Họ và tên không được quá 100 ký tự' }
            ]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { 
                pattern: /^[0-9]{8,11}$/, 
                message: 'Số điện thoại phải có 8-11 chữ số' 
              },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  // Cho phép số điện thoại Việt Nam: bắt đầu bằng 0 (10-11 chữ số)
                  if (value.startsWith('0') && value.length >= 10) {
                    return Promise.resolve();
                  }
                  // Cho phép số điện thoại quốc tế hoặc số test (8-11 chữ số, không bắt đầu bằng 0)
                  if (/^[1-9][0-9]{7,10}$/.test(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Số điện thoại không hợp lệ'));
                }
              }
            ]}
          >
            <Input placeholder="Nhập số điện thoại (8-11 chữ số)" />
          </Form.Item>
          <Form.Item 
            name="email" 
            label="Email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ' },
              { max: 100, message: 'Email không được quá 100 ký tự' }
            ]}
          >
            <Input type="email" placeholder="Nhập email (tùy chọn)" />
          </Form.Item>
          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              { required: true, message: 'Vui lòng nhập địa chỉ' },
              { max: 200, message: 'Địa chỉ không được quá 200 ký tự' }
            ]}
          >
            <Input placeholder="Nhập địa chỉ chi tiết" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ward"
                label="Phường/Xã"
                rules={[
                  { required: true, message: 'Vui lòng nhập phường/xã' },
                  { max: 50, message: 'Phường/Xã không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Phường/Xã" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="district"
                label="Quận/Huyện"
                rules={[
                  { required: true, message: 'Vui lòng nhập quận/huyện' },
                  { max: 50, message: 'Quận/Huyện không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Quận/Huyện" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="province"
                label="Tỉnh/Thành phố"
                rules={[
                  { required: true, message: 'Vui lòng nhập tỉnh/thành phố' },
                  { max: 50, message: 'Tỉnh/Thành phố không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Tỉnh/Thành phố" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="postalCode" 
            label="Mã bưu điện"
            rules={[
              { max: 10, message: 'Mã bưu điện không được quá 10 ký tự' }
            ]}
          >
            <Input placeholder="Mã bưu điện (tùy chọn)" />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Đặt làm địa chỉ mặc định</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Thêm địa chỉ
              </Button>
              <Button onClick={() => {
                setShowAddressModal(false);
                addressForm.resetFields();
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageWrapper>
  );
};

export default CheckoutPage;


