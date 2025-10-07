# MainLayout Component

MainLayout là component layout chính của ứng dụng LMobile, chứa Header và Footer cố định với nội dung động ở giữa.

## Cấu trúc

```
MainLayout/
├── MainLayout.tsx          # Component chính
├── MainLayout.scss         # Styles cho layout
└── index.ts               # Export file
```

## Sử dụng

### Cơ bản

```tsx
import { MainLayout } from './layouts';

function MyPage() {
  return (
    <MainLayout>
      <div className="container">
        <h1>Nội dung trang</h1>
        <p>Nội dung của bạn ở đây</p>
      </div>
    </MainLayout>
  );
}
```

### Với PageWrapper và các state components

```tsx
import { MainLayout } from './layouts';
import { PageWrapper, Loading, ErrorState, EmptyState } from './components';
import { useLayout } from './hooks';

function MyPage() {
  const { layoutState, setLoading, setError, setEmpty } = useLayout();

  return (
    <MainLayout>
      <div className="container">
        <PageWrapper
          loading={layoutState.loading}
          error={layoutState.error}
          empty={layoutState.empty}
          onRetry={() => {
            setError(null);
            // Retry logic
          }}
        >
          {/* Nội dung chính */}
        </PageWrapper>
      </div>
    </MainLayout>
  );
}
```

## Components hỗ trợ

### Loading
Hiển thị trạng thái loading với spinner.

```tsx
<Loading size="large" tip="Đang tải dữ liệu..." />
```

### ErrorState
Hiển thị trạng thái lỗi với nút retry.

```tsx
<ErrorState 
  title="Đã xảy ra lỗi"
  message="Không thể tải dữ liệu"
  onRetry={handleRetry}
/>
```

### EmptyState
Hiển thị trạng thái trống.

```tsx
<EmptyState 
  title="Không có dữ liệu"
  message="Chưa có sản phẩm nào"
  action={<Button>Thêm sản phẩm</Button>}
/>
```

### PageWrapper
Wrapper component tự động hiển thị các state phù hợp.

```tsx
<PageWrapper
  loading={loading}
  error={error}
  empty={empty}
  onRetry={handleRetry}
>
  {/* Nội dung */}
</PageWrapper>
```

## Hook useLayout

Hook để quản lý state của layout.

```tsx
const { 
  layoutState, 
  setLoading, 
  setError, 
  setEmpty, 
  resetLayout, 
  handleAsync 
} = useLayout();

// Sử dụng handleAsync để tự động quản lý loading/error
const data = await handleAsync(async () => {
  return await fetchData();
});
```

## Responsive

Layout tự động responsive với các breakpoint:
- Desktop: > 1200px
- Tablet: 768px - 1200px  
- Mobile: < 768px

## CSS Classes

- `.main-layout`: Container chính
- `.main-content`: Vùng nội dung chính
- `.content-wrapper`: Wrapper cho nội dung
- `.container`: Container với max-width và padding
- `.loading-container`: Container cho loading state
- `.error-container`: Container cho error state
- `.empty-container`: Container cho empty state

## Ví dụ hoàn chỉnh

Xem file `HomePage.tsx` để có ví dụ hoàn chỉnh về cách sử dụng MainLayout với tất cả các tính năng.
