import { ProductImage } from "./productImage.model.js";
import { Product } from "./product.model.js";

export const productImageService = {
  // Lấy tất cả hình ảnh của sản phẩm
  async getByProductId(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    return await ProductImage.find({ productId: numericId })
      .sort({ sortOrder: 1, createdAt: 1 });
  },

  // Lấy hình ảnh chính (primary)
  async getPrimary(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    return await ProductImage.findOne({ productId: numericId, isPrimary: true });
  },

  // Thêm hình ảnh mới
  async create(productId, imageData) {
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

    // Nếu set isPrimary = true, unset các primary khác
    if (imageData.isPrimary) {
      await ProductImage.updateMany(
        { productId: numericId, isPrimary: true },
        { $set: { isPrimary: false } }
      );
    }

    // Generate _id
    const lastImage = await ProductImage.findOne().sort({ _id: -1 }).select('_id');
    const newId = lastImage ? lastImage._id + 1 : 1;

    const image = new ProductImage({
      _id: newId,
      productId: numericId,
      ...imageData
    });
    await image.save();

    return image;
  },

  // Cập nhật hình ảnh
  async update(imageId, updateData) {
    const numericId = typeof imageId === 'number' 
      ? imageId 
      : parseInt(String(imageId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Image ID không hợp lệ");
    }

    // Nếu set isPrimary = true, unset các primary khác
    if (updateData.isPrimary) {
      const image = await ProductImage.findOne({ _id: numericId });
      if (image) {
        await ProductImage.updateMany(
          { productId: image.productId, isPrimary: true, _id: { $ne: numericId } },
          { $set: { isPrimary: false } }
        );
      }
    }

    const image = await ProductImage.findOneAndUpdate(
      { _id: numericId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!image) {
      throw new Error("Hình ảnh không tồn tại");
    }

    return image;
  },

  // Xóa hình ảnh
  async delete(imageId) {
    const numericId = typeof imageId === 'number' 
      ? imageId 
      : parseInt(String(imageId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Image ID không hợp lệ");
    }

    const image = await ProductImage.findOneAndDelete({ _id: numericId });
    if (!image) {
      throw new Error("Hình ảnh không tồn tại");
    }

    return { message: "Xóa hình ảnh thành công" };
  },

  // Xóa tất cả hình ảnh của sản phẩm
  async deleteByProductId(productId) {
    const numericId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericId)) {
      throw new Error("Product ID không hợp lệ");
    }

    await ProductImage.deleteMany({ productId: numericId });
    return { message: "Xóa tất cả hình ảnh thành công" };
  }
};

