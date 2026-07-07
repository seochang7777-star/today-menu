import { useState } from "react";

const CAT_ICON = {
  한식: "🍚",
  일식: "🍣",
  중식: "🥟",
  양식: "🥩",
  분식: "🍜",
  치킨: "🍗",
  카페: "☕",
  술집: "🍺",
};

// ── 카테고리별 이미지 풀 ───────────────────────────────────────────────────
const CAT_IMAGES = {
  한식: Array.from({ length: 14 }, (_, i) => `/img/food_category/한식/한식${i + 1}.png`),
  일식: [
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식${i + 1}.png`),
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식우동${i + 6}.png`),
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식규동${i + 11}.png`),
  ],
  중식: [
    ...Array.from({ length: 8 },  (_, i) => `/img/food_category/중식/중식${i + 1}.png`),
    ...Array.from({ length: 7 },  (_, i) => `/img/food_category/중식/중식${i + 9}.jpg`),
  ],
  양식: Array.from({ length: 20 }, (_, i) => `/img/food_category/양식/양식${i + 1}.jpg`),
  분식: Array.from({ length: 15 }, (_, i) => `/img/food_category/분식/분식${i + 1}.jpg`),
  치킨: Array.from({ length: 15 }, (_, i) => `/img/food_category/치킨/치킨${i + 1}.jpg`),
  카페: Array.from({ length: 15 }, (_, i) => `/img/food_category/카페/카페${i + 1}.jpg`),
  술집: Array.from({ length: 15 }, (_, i) => `/img/food_category/술집/술집${i + 1}.jpg`),
};

// id 기반으로 이미지 고정 배정 (같은 식당 = 항상 같은 이미지)
function getCategoryImage(category, id) {
  const images = CAT_IMAGES[category];
  if (!images || images.length === 0) return null;
  const idx = Math.abs(Number(id) || 0) % images.length;
  return images[idx];
}

export default function RestaurantImage({
  imageUrl,
  category,
  name,
  id,
  height = 180,
  iconSize = "2.5rem",
}) {
  const [imgError, setImgError] = useState(false);

  // 우선순위: 직접 이미지 URL → 카테고리 이미지 풀에서 id 기반 배정
  const src = imageUrl || getCategoryImage(category, id);

  return (
    <div
      style={{
        height,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-surface)",
      }}
    >
      {!imgError && src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: iconSize }}>
          {CAT_ICON[category] ?? "🍴"}
        </span>
      )}
    </div>
  );
}
