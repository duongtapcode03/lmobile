import { ProductVariant } from "./productVariant.model.js";
import { Product } from "./product.model.js";

export const productVariantService = {
  // Lấy tất cả variants của sản phẩm
  async getByProductId(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    return await ProductVariant.find({ productId: numericId })
      .sort({ sortOrder: 1, createdAt: 1 });
  },

  // Lấy variant theo type
  async getByType(productId, type) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    return await ProductVariant.find({ productId: numericId, type })
      .sort({ sortOrder: 1 });
  },

  // Lấy variant mặc định
  async getDefault(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    return await ProductVariant.findOne({ productId: numericId, isDefault: true });
  },

  // Thêm variant mới
  async create(productId, variantData) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    // Kiểm tra product tồn tại
    const product = await Product.findOne({ _id: numericId });
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Nếu set isDefault = true, unset các default khác (handled by pre-save middleware)
    
    // Generate _id
    const lastVariant = await ProductVariant.findOne().sort({ _id: -1 }).select('_id');
    const newId = lastVariant ? lastVariant._id + 1 : 1;

    const variant = new ProductVariant({
      _id: newId,
      productId: numericId,
      ...variantData
    });
    await variant.save();

    return variant;
  },

  // Cập nhật variant
  async update(variantId, updateData) {
    const numericId = typeof variantId === 'number' 
      ? variantId 
      : parseInt(String(variantId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Variant ID không hợp lệ");
    }

    // isDefault handling is done by pre-save middleware
    const variant = await ProductVariant.findOneAndUpdate(
      { _id: numericId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!variant) {
      throw new Error("Variant không tồn tại");
    }

    return variant;
  },

  // Xóa variant
  async delete(variantId) {
    const numericId = typeof variantId === 'number' 
      ? variantId 
      : parseInt(String(variantId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Variant ID không hợp lệ");
    }

    const variant = await ProductVariant.findOneAndDelete({ _id: numericId });
    if (!variant) {
      throw new Error("Variant không tồn tại");
    }

    return { message: "Xóa variant thành công" };
  },

  // Xóa tất cả variants của sản phẩm
  async deleteByProductId(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    await ProductVariant.deleteMany({ productId: numericId });
    return { message: "Xóa tất cả variants thành công" };
  }
};

