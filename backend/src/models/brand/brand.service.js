import { Brand } from "./brand.model.js";
import { Product } from "../product/product.model.js";

export const brandService = {
  /**
   * Tạo brand mới
   */
  async createBrand(data) {
    try {
      const brand = new Brand(data);
      await brand.save();
      return brand;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Tên thương hiệu hoặc slug đã tồn tại");
      }
      throw error;
    }
  },

  /**
   * Lấy tất cả brands
   */
  async getAllBrands(query = {}) {
    const {
      isActive,
      sortBy = "sortOrder",
      sortOrder = "asc",
      search = ""
    } = query;

    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const brands = await Brand.find(filter)
      .sort(sort)
      .lean();

    return brands;
  },

  /**
   * Lấy brand theo ID (number)
   */
  async getBrandById(id) {
    const brandId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(brandId)) {
      throw new Error("Brand ID không hợp lệ");
    }
    const brand = await Brand.findOne({ _id: brandId });
    if (!brand) {
      throw new Error("Không tìm thấy thương hiệu");
    }
    return brand;
  },

  /**
   * Lấy brand theo slug
   */
  async getBrandBySlug(slug) {
    const brand = await Brand.findOne({ slug: slug.toLowerCase() });
    if (!brand) {
      throw new Error("Không tìm thấy thương hiệu");
    }
    return brand;
  },

  /**
   * Lấy brand theo name
   */
  async getBrandByName(name) {
    const brand = await Brand.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });
    return brand;
  },

  /**
   * Update brand
   */
  async updateBrand(id, data) {
    const brandId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(brandId)) {
      throw new Error("Brand ID không hợp lệ");
    }
    const brand = await Brand.findOneAndUpdate(
      { _id: brandId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!brand) {
      throw new Error("Không tìm thấy thương hiệu");
    }
    return brand;
  },

  /**
   * Delete brand
   */
  async deleteBrand(id) {
    const brandId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(brandId)) {
      throw new Error("Brand ID không hợp lệ");
    }
    const brand = await Brand.findOneAndDelete({ _id: brandId });
    if (!brand) {
      throw new Error("Không tìm thấy thương hiệu");
    }
    return brand;
  },

  /**
   * Lấy statistics cho brand
   */
  async getBrandStats(id) {
    const brandId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(brandId)) {
      throw new Error("Brand ID không hợp lệ");
    }
    const brand = await Brand.findOne({ _id: brandId });
    if (!brand) {
      throw new Error("Không tìm thấy thương hiệu");
    }

    const productCount = await Product.countDocuments({ 
      brandRef: brandId, 
      isActive: true 
    });

    return {
      brand: brand.toObject(),
      productCount,
      totalItems: productCount
    };
  },

  /**
   * Sync brands từ products (auto-create missing brands)
   */
  async syncBrandsFromPhoneDetails() {
    const brandsFromProducts = await Product.distinct("brand");
    const existingBrands = await Brand.find({}).select("name");
    const existingBrandNames = existingBrands.map(b => b.name.toLowerCase());

    const newBrands = brandsFromProducts.filter(
      brand => !existingBrandNames.includes(brand.toLowerCase())
    );

    if (newBrands.length === 0) {
      return {
        message: "Tất cả brands đã tồn tại",
        created: 0,
        existing: existingBrands.length
      };
    }

    const brandsToCreate = newBrands.map(name => ({
      name: name,
      isActive: true
    }));

    const result = await Brand.insertMany(brandsToCreate, { ordered: false });

    return {
      message: `Đã tạo ${result.length} brands mới`,
      created: result.length,
      existing: existingBrands.length,
      total: existingBrands.length + result.length
    };
  }
};

