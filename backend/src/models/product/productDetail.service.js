import { ProductDetail } from "./productDetail.model.js";
import { Product } from "./product.model.js";

/**
 * Helper function để tìm product detail bằng productId
 */
export async function findProductDetailByProductId(productId) {
  if (!productId) return null;
  
  const numericId = typeof productId === 'number' 
    ? productId 
    : parseInt(String(productId).trim(), 10);
  
  if (isNaN(numericId)) {
    return null;
  }
  
  return await ProductDetail.findOne({ productId: numericId });
}

export const productDetailService = {
  // Lấy chi tiết sản phẩm theo productId
  async getByProductId(productId) {
    const detail = await findProductDetailByProductId(productId);
    return detail;
  },

  // Tạo hoặc cập nhật chi tiết sản phẩm
  async upsert(productId, data) {
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

    // Tìm hoặc tạo detail
    let detail = await ProductDetail.findOne({ productId: numericId });
    
    if (detail) {
      // Update existing
      Object.assign(detail, data);
      await detail.save();
    } else {
      // Create new
      const lastDetail = await ProductDetail.findOne().sort({ _id: -1 }).select('_id');
      const newId = lastDetail ? lastDetail._id + 1 : 1;
      
      detail = new ProductDetail({
        _id: newId,
        productId: numericId,
        ...data
      });
      await detail.save();
    }

    return detail;
  },

  // Xóa chi tiết sản phẩm
  async deleteByProductId(productId) {
    const detail = await findProductDetailByProductId(productId);
    if (detail) {
      await ProductDetail.deleteOne({ _id: detail._id });
    }
    return { message: "Xóa chi tiết sản phẩm thành công" };
  }
};

