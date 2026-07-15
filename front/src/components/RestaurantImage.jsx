import { useState } from "react";

const CAT_ICON = {
  한식: './img/category/korean.png',
  일식: './img/category/japanese.webp',
  중식: './img/category/chinese.webp',
  양식: './img/category/steak.webp',
  분식: './img/category/snack.webp',
  치킨: './img/category/chicken.webp',
  카페: './img/category/coffee.webp',
  술집: './img/category/beer.webp'
};

// ── 카테고리별 이미지 풀 ───────────────────────────────────────────────────
const CAT_IMAGES = {
  한식: Array.from({ length: 14 }, (_, i) => `/img/food_category/한식/한식${i + 1}.png`),
  일식: [
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식${i + 1}.png`),
    ...Array.from({ length: 4 },  (_, i) => `/img/food_category/일식/일식${i + 6}.jpg`),
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식우동${i + 6}.png`),
    ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식규동${i + 11}.png`),
  ],
  중식: [
    ...Array.from({ length: 8 },  (_, i) => `/img/food_category/중식/중식${i + 1}.png`),
    ...Array.from({ length: 7 },  (_, i) => `/img/food_category/중식/중식${i + 9}.jpg`),
  ],
  양식: [
    ...Array.from({ length: 15 }, (_, i) => `/img/food_category/양식/양식${i + 1}.jpg`),
    '/img/food_category/양식/양식피자16.jpg',
    '/img/food_category/양식/양식피자17.jpg',
    '/img/food_category/양식/양식피자18.jpg',
    '/img/food_category/양식/양식피자19.jpg',
    '/img/food_category/양식/양식피자20.jpg',
  ],
  분식: Array.from({ length: 15 }, (_, i) => `/img/food_category/분식/분식${i + 1}.jpg`),
  치킨: Array.from({ length: 15 }, (_, i) => `/img/food_category/치킨/치킨${i + 1}.jpg`),
  카페: Array.from({ length: 15 }, (_, i) => `/img/food_category/카페/카페${i + 1}.jpg`),
  술집: Array.from({ length: 15 }, (_, i) => `/img/food_category/술집/술집${i + 1}.jpg`),
};

const IMAGE_RULES = [
  {
    keywords: ['훠궈'],
    images: [
      '/img/food_category/중식/중식19.jpg',
      '/img/food_category/중식/중식20.jpg',
      '/img/food_category/중식/중식21.jpg',
      '/img/food_category/중식/중식22.jpg',
      '/img/food_category/중식/중식23.jpg',
    ],
  },
  {
    category: '분식',
    keywords: ['김밥'],
    images: [
      '/img/food_category/분식/분식8.jpg',
      '/img/food_category/분식/분식9.jpg',
    ],
  },
  {
    category: '양식',
    keywords: ['피자'],
    images: [
      '/img/food_category/양식/양식피자16.jpg',
      '/img/food_category/양식/양식피자17.jpg',
      '/img/food_category/양식/양식피자18.jpg',
      '/img/food_category/양식/양식피자19.jpg',
      '/img/food_category/양식/양식피자20.jpg',
    ],
  },
  {
    category: '일식',
    keywords: ['규동'],
    images: [
      ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식규동${i + 11}.png`),
    ],
  },
  {
    category: '일식',
    keywords: ['우동'],
    images: [
      ...Array.from({ length: 5 },  (_, i) => `/img/food_category/일식/일식우동${i + 6}.png`),
    ],
  },
  {
    category: '중식',
    keywords: ['반점'],
    images: [
      '/img/food_category/중식/중식1.png',
      '/img/food_category/중식/중식2.png',
      '/img/food_category/중식/중식3.png',
    ],
  },
  {
    category: '중식',
    keywords: ['마라'],
    images: [
      '/img/food_category/중식/중식16.webp',
      '/img/food_category/중식/중식17.png',
      '/img/food_category/중식/중식18.jpg',
    ],
  },
  {
    category: '한식',
    keywords: ['고기', '숯불', '삼겹살'],
    images: [
      '/img/food_category/한식/한식12.png',
      '/img/food_category/한식/한식15.jpg',
      '/img/food_category/한식/한식16.jpg',
      '/img/food_category/한식/한식17.jpg',
    ]
  },
  {
    category: '한식',
    keywords: ['육회', '뭉티기', '육사시미'],
    images: [
      '/img/food_category/한식/한식19.png',
      '/img/food_category/한식/한식20.jpg',
      '/img/food_category/한식/한식21.webp',
    ]
  },
  {
    category: '양식',
    keywords: ['아웃백', '빕스', '스테이크'],
    images: [
      '/img/food_category/양식/양식16.jpg',
      '/img/food_category/양식/양식17.jpg',
      '/img/food_category/양식/양식18.jpg',
      '/img/food_category/양식/양식19.jpg',
      '/img/food_category/양식/양식20.jpg',
    ]
  },
  {
    category: '한식',
    keywords: ['설렁탕', '갈비탕', '설농탕'],
    images: [
      '/img/food_category/한식/한식22.webp',
      '/img/food_category/한식/한식23.png',
      '/img/food_category/한식/한식24.jpg',
      '/img/food_category/한식/한식25.webp',
    ]
  },
  {
    category: '한식',
    keywords: ['감자탕', '뼈해장국'],
    images: [
      '/img/food_category/한식/한식26.webp',
      '/img/food_category/한식/한식27.webp',
      '/img/food_category/한식/한식28.jpg',
    ]
  },
];

function stableHash(value) {
  return String(value ?? '').split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }, 0);
}

function pickStableImage(images, seed) {
  if (!images || images.length === 0) return null;
  const idx = Math.abs(stableHash(seed)) % images.length;
  return images[idx];
}

// id 기반으로 이미지 고정 배정 (같은 식당 = 항상 같은 이미지)
function getCategoryImage(category, id) {
  const images = CAT_IMAGES[category];
  return pickStableImage(images, id);
}

function getRuleImage(category, name, id) {
  const normalizedName = String(name ?? '').replace(/\s/g, '');
  const rule = IMAGE_RULES.find(({ category: ruleCategory, keywords }) => {
    return (ruleCategory == null || ruleCategory === category) &&
      keywords.some((keyword) => normalizedName.includes(keyword));
  });

  if (!rule) return null;
  return pickStableImage(rule.images, `${category}-${name}-${id}`);
}

export default function RestaurantImage({
  imageUrl,
  category,
  name,
  id,
  height = 180,
  iconSize = "2.5rem",
  className = "",
  style,
}) {
  const [imgError, setImgError] = useState(false);

  // 우선순위: 직접 이미지 URL → 이름/카테고리 조건 이미지 → 카테고리 기본 이미지
  const src = imageUrl || getRuleImage(category, name, id) || getCategoryImage(category, id);

  return (
    <div
      className={className}
      style={{
        height,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-surface)",
        ...style,
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
        <span style={{ fontSize: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {CAT_ICON[category] ? (
            <img
                src={src}
                alt={name}
                className="h-full w-full object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
          ) : (
            "🍴"
          )}
        </span>
      )}
    </div>
  );
}
