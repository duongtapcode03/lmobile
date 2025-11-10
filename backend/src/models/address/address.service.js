import { Address } from "./address.model.js";

export const addressService = {
  /**
   * Tạo địa chỉ mới
   */
  async createAddress(userId, addressData) {
    const address = new Address({
      user: userId,
      ...addressData
    });
    
    await address.save();
    return address;
  },

  /**
   * Lấy tất cả địa chỉ của user
   */
  async getUserAddresses(userId) {
    return await Address.find({ 
      user: userId,
      isActive: true
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  },

  /**
   * Lấy địa chỉ mặc định của user
   */
  async getDefaultAddress(userId) {
    return await Address.findOne({
      user: userId,
      isDefault: true,
      isActive: true
    });
  },

  /**
   * Lấy địa chỉ theo ID
   */
  async getAddressById(addressId, userId) {
    const address = await Address.findOne({
      _id: addressId,
      user: userId
    });
    
    if (!address) {
      throw new Error("Địa chỉ không tồn tại");
    }
    
    return address;
  },

  /**
   * Update địa chỉ
   */
  async updateAddress(addressId, userId, updateData) {
    const address = await this.getAddressById(addressId, userId);
    
    // Nếu set isDefault = true, cần bỏ default của các address khác
    if (updateData.isDefault && !address.isDefault) {
      await Address.updateMany(
        { user: userId, _id: { $ne: addressId } },
        { isDefault: false }
      );
    }
    
    Object.assign(address, updateData);
    await address.save();
    
    return address;
  },

  /**
   * Xóa địa chỉ (soft delete)
   */
  async deleteAddress(addressId, userId) {
    const address = await this.getAddressById(addressId, userId);
    
    // Không cho xóa địa chỉ default nếu còn địa chỉ khác
    if (address.isDefault) {
      const otherAddresses = await Address.countDocuments({
        user: userId,
        _id: { $ne: addressId },
        isActive: true
      });
      
      if (otherAddresses > 0) {
        // Set một địa chỉ khác làm default
        const newDefault = await Address.findOne({
          user: userId,
          _id: { $ne: addressId },
          isActive: true
        });
        
        if (newDefault) {
          newDefault.isDefault = true;
          await newDefault.save();
        }
      }
    }
    
    // Soft delete
    address.isActive = false;
    await address.save();
    
    return address;
  },

  /**
   * Set địa chỉ làm mặc định
   */
  async setDefaultAddress(addressId, userId) {
    // Bỏ default của tất cả address khác
    await Address.updateMany(
      { user: userId, _id: { $ne: addressId } },
      { isDefault: false }
    );
    
    // Set address này làm default
    const address = await this.getAddressById(addressId, userId);
    address.isDefault = true;
    await address.save();
    
    return address;
  },

  /**
   * Đếm số lượng địa chỉ của user
   */
  async countUserAddresses(userId) {
    return await Address.countDocuments({
      user: userId,
      isActive: true
    });
  }
};

