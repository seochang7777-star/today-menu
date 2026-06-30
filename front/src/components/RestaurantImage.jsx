import { useState } from "react";

const CAT_ICON = {
  한식: "🍚",
  일식: "🍣",
  중식: "🥟",
  양식: "🥩",
  분식: "🍜",
  치킨: "🍗",
  피자: "🍕",
  카페: "☕",
  술집: "🍺",
};

const CAT_IMG = {
  한식: "/food_category/korean.avif",
  일식: "/food_category/japanese.webp",
  중식: "/food_category/chinese.webp",
  양식: "/food_category/western.jpg",
  분식: "/food_category/street-food.jpg",
  치킨: "/food_category/chicken.jpg",
  피자: "/food_category/pizza.jpg",
  카페: "/food_category/cafe.webp",
  술집: "/food_category/pub.webp",
};

export default function RestaurantImage({
  imageUrl,
  category,
  name,
  height = 180,
  iconSize = "2.5rem",
}) {
  const [imgError, setImgError] = useState(false);

  const src = imageUrl || CAT_IMG[category];

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