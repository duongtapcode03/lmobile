# 📜 Scripts Documentation

Thư mục này chứa các scripts để transform và import data.

## 📁 Files

### `transformPhoneData.js`
Transform `phone_data_details.json` sang format MongoDB-friendly.

**Usage:**
```bash
node scripts/transformPhoneData.js
```

**Output:**
- `data/transformed/phone_data_transformed.json`
- `data/transformed/phone_data_chunk_*.json`
- `data/transformed/phone_data_summary.json`

### `transformBlogData.js`
Transform `blog_posts_merged.json` sang format MongoDB-friendly.

**Usage:**
```bash
node scripts/transformBlogData.js
```

**Output:**
- `data/transformed/blog_data_transformed.json`
- `data/transformed/blog_data_chunk_*.json`
- `data/transformed/blog_data_summary.json`

### `importToMongoDB.js`
Import transformed data vào MongoDB.

**Usage:**
```bash
# Import all
node scripts/importToMongoDB.js --type=all

# Import specific type
node scripts/importToMongoDB.js --type=phone
node scripts/importToMongoDB.js --type=blog

# Import specific chunk
node scripts/importToMongoDB.js --type=phone --chunk=1

# Drop collection first
node scripts/importToMongoDB.js --type=all --drop
```

**Options:**
- `--type`: `phone` | `blog` | `all`
- `--chunk`: Chunk number (optional)
- `--drop`: Drop collection before import

## 🔄 Workflow

1. **Transform data:**
   ```bash
   node scripts/transformPhoneData.js
   node scripts/transformBlogData.js
   ```

2. **Review transformed data:**
   ```bash
   cat data/transformed/phone_data_summary.json
   cat data/transformed/blog_data_summary.json
   ```

3. **Import to MongoDB:**
   ```bash
   node scripts/importToMongoDB.js --type=all
   ```

4. **Verify import:**
   - Check MongoDB collections
   - Verify document counts
   - Test queries


